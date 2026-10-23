package expo.modules.spiderusage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Web Focus guard: while a focus session runs, checks every few seconds whether a
 * distracting app came to the front and, if so, says something about it right away
 * instead of after the session. Runs as a foreground service with a quiet ongoing
 * notification, and stops by itself when the session ends.
 */
class GuardService : Service() {
  companion object {
    const val EXTRA_ENDS_AT = "endsAt"
    const val EXTRA_KEYWORDS = "keywords"
    const val EXTRA_LINES = "lines"
    const val EXTRA_TITLE = "title"
    private const val CHANNEL_ONGOING = "spider-guard"
    private const val CHANNEL_ALERT = "spider-guard-alert"
    private const val ONGOING_ID = 47110
    private const val ALERT_ID = 47111
    private const val POLL_MS = 4000L
    private const val QUIET_MS = 60_000L // per app, between two alerts
  }

  // Usage-event reads run on their own thread, not the app's UI thread. Service lifecycle calls stay on main.
  private val thread = HandlerThread("spider-guard").apply { start() }
  private val handler = Handler(thread.looper)
  private val main = Handler(Looper.getMainLooper())
  @Volatile private var endsAt = 0L
  @Volatile private var keywords: List<String> = emptyList()
  @Volatile private var lines: List<String> = emptyList()
  private var lastCheck = 0L // only touched on `thread`
  private val lastAlert = HashMap<String, Long>() // only touched on `thread`

  private val tick = object : Runnable {
    override fun run() {
      if (System.currentTimeMillis() >= endsAt) {
        // Re-checked on main: a restart there may have moved the end in the meantime.
        main.post { if (System.currentTimeMillis() >= endsAt) shutDown() }
        return
      }
      try {
        scan()
      } catch (e: Exception) {
        // a failed read is skipped; the next tick tries again
      }
      handler.postDelayed(this, POLL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    endsAt = intent?.getLongExtra(EXTRA_ENDS_AT, 0L) ?: 0L
    keywords = intent?.getStringArrayListExtra(EXTRA_KEYWORDS)?.map { it.lowercase(Locale.ROOT) } ?: emptyList()
    lines = intent?.getStringArrayListExtra(EXTRA_LINES) ?: emptyList()
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Web Focus"

    ensureChannels()
    val ongoing = Notification.Builder(this, CHANNEL_ONGOING)
      .setSmallIcon(iconId())
      .setContentTitle(title)
      .setContentText("Guarding your web until ${clock(endsAt)}")
      .setOngoing(true)
      .setContentIntent(openApp())
      .build()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(ONGOING_ID, ongoing, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(ONGOING_ID, ongoing)
      }
    } catch (e: Exception) {
      stopSelf()
      return START_NOT_STICKY
    }

    if (endsAt <= System.currentTimeMillis()) {
      shutDown()
      return START_NOT_STICKY
    }
    handler.removeCallbacksAndMessages(null) // a restart replaces the running loop
    handler.post {
      lastCheck = System.currentTimeMillis()
      tick.run()
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    thread.quitSafely()
    super.onDestroy()
  }

  private fun shutDown() {
    handler.removeCallbacksAndMessages(null)
    stopForeground(Service.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  /** Looks at what came to the front since the last check. */
  private fun scan() {
    val now = System.currentTimeMillis()
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usm.queryEvents(lastCheck - 1000L, now)
    lastCheck = now
    val event = UsageEvents.Event()
    var hit: String? = null
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType != UsageEvents.Event.ACTIVITY_RESUMED) continue
      val pkg = event.packageName ?: continue
      val lower = pkg.lowercase(Locale.ROOT)
      if (pkg != packageName && keywords.any { lower.contains(it) }) hit = pkg
    }
    val pkg = hit ?: return
    if (now - (lastAlert[pkg] ?: 0L) < QUIET_MS) return
    lastAlert[pkg] = now
    alert(pkg)
  }

  private fun alert(pkg: String) {
    val label = try {
      packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
    } catch (e: Exception) {
      pkg
    }
    val text = (if (lines.isEmpty()) "{app} during Web Focus? Back to work." else lines.random()).replace("{app}", label)
    val notification = Notification.Builder(this, CHANNEL_ALERT)
      .setSmallIcon(iconId())
      .setContentTitle("🕸️ $label? During focus?")
      .setContentText(text)
      .setStyle(Notification.BigTextStyle().bigText(text))
      .setAutoCancel(true)
      .setContentIntent(openApp())
      .build()
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(ALERT_ID, notification)
  }

  private fun ensureChannels() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(NotificationChannel(CHANNEL_ONGOING, "Web Focus guard", NotificationManager.IMPORTANCE_LOW))
    nm.createNotificationChannel(NotificationChannel(CHANNEL_ALERT, "Web Focus alerts", NotificationManager.IMPORTANCE_HIGH))
  }

  /** The app's notification icon (made by the expo-notifications plugin), or the launcher icon. */
  private fun iconId(): Int {
    val id = resources.getIdentifier("notification_icon", "drawable", packageName)
    return if (id != 0) id else applicationInfo.icon
  }

  private fun openApp(): PendingIntent? {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun clock(ms: Long): String = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ms))
}
