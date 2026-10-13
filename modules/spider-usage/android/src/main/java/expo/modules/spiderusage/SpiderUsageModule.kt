package expo.modules.spiderusage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Phone usage for S.P.I.D.E.R.: which apps were on screen, and when, built from
 * Android's usage events. Needs the special "Usage access" permission, which the
 * user grants in system settings (see openSettings).
 */
class SpiderUsageModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private data class Span(val pkg: String, val start: Long, val end: Long)

  override fun definition() = ModuleDefinition {
    Name("SpiderUsage")

    Function("hasPermission") { hasUsageAccess() }

    Function("openSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      (appContext.currentActivity ?: context).startActivity(intent)
    }

    AsyncFunction("getUsage") { startMs: Double, endMs: Double ->
      val totals = LinkedHashMap<String, Long>()
      for (s in foregroundSpans(startMs.toLong(), endMs.toLong())) {
        totals[s.pkg] = (totals[s.pkg] ?: 0L) + (s.end - s.start)
      }
      totals.map { (pkg, ms) ->
        mapOf(
          "packageName" to pkg,
          "label" to labelOf(pkg),
          "foregroundMs" to ms.toDouble(),
          "isGame" to isGame(pkg),
        )
      }
    }

    // Web Focus guard (GuardService): alerts the moment a distracting app opens, until `endsAtMs`.
    Function("startGuard") { endsAtMs: Double, keywords: List<String>, lines: List<String>, title: String ->
      if (!hasUsageAccess()) {
        false
      } else {
        val intent = Intent(context, GuardService::class.java)
          .putExtra(GuardService.EXTRA_ENDS_AT, endsAtMs.toLong())
          .putStringArrayListExtra(GuardService.EXTRA_KEYWORDS, ArrayList(keywords))
          .putStringArrayListExtra(GuardService.EXTRA_LINES, ArrayList(lines))
          .putExtra(GuardService.EXTRA_TITLE, title)
        try {
          context.startForegroundService(intent)
          true
        } catch (e: Exception) {
          false
        }
      }
    }

    Function("stopGuard") {
      context.stopService(Intent(context, GuardService::class.java))
    }

    // How many times the phone was unlocked between two times.
    AsyncFunction("getUnlocks") { startMs: Double, endMs: Double ->
      countUnlocks(startMs.toLong(), endMs.toLong())
    }

    AsyncFunction("getForegroundSpans") { startMs: Double, endMs: Double ->
      foregroundSpans(startMs.toLong(), endMs.toLong()).map {
        mapOf(
          "packageName" to it.pkg,
          "label" to labelOf(it.pkg),
          "start" to it.start.toDouble(),
          "end" to it.end.toDouble(),
        )
      }
    }
  }

  private fun hasUsageAccess(): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun countUnlocks(start: Long, end: Long): Int {
    if (!hasUsageAccess() || Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return 0
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usm.queryEvents(start, end)
    val event = UsageEvents.Event()
    var n = 0
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.KEYGUARD_HIDDEN) n++
    }
    return n
  }

  /** Home screen, keyboard and system UI aren't "using an app". Neither is S.P.I.D.E.R. itself. */
  private fun ignoredPackages(): Set<String> {
    val ignored = mutableSetOf(context.packageName, "android", "com.android.systemui")
    val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    context.packageManager.queryIntentActivities(home, 0).forEach { ignored.add(it.activityInfo.packageName) }
    Settings.Secure.getString(context.contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
      ?.substringBefore('/')
      ?.let { ignored.add(it) }
    return ignored
  }

  /** Periods each app was in the foreground, clipped to [start, end]. */
  private fun foregroundSpans(start: Long, end: Long): List<Span> {
    if (!hasUsageAccess()) return emptyList()
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    // Look back a little so an app that was already open at `start` is counted.
    val events = usm.queryEvents(start - 3 * 60 * 60 * 1000L, end)
    val ignored = ignoredPackages()
    val spans = ArrayList<Span>()
    val event = UsageEvents.Event()
    var current: String? = null
    var since = 0L

    fun close(at: Long) {
      val pkg = current ?: return
      val s = maxOf(since, start)
      val e = minOf(at, end)
      if (e > s && pkg !in ignored) spans.add(Span(pkg, s, e))
      current = null
    }

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          close(event.timeStamp)
          current = event.packageName
          since = event.timeStamp
        }
        UsageEvents.Event.ACTIVITY_PAUSED, UsageEvents.Event.ACTIVITY_STOPPED -> {
          if (event.packageName == current) close(event.timeStamp)
        }
        UsageEvents.Event.SCREEN_NON_INTERACTIVE, UsageEvents.Event.KEYGUARD_SHOWN -> close(event.timeStamp)
      }
    }
    close(minOf(end, System.currentTimeMillis()))
    return spans
  }

  private fun appInfo(pkg: String): ApplicationInfo? =
    try {
      context.packageManager.getApplicationInfo(pkg, 0)
    } catch (e: PackageManager.NameNotFoundException) {
      null
    }

  private fun labelOf(pkg: String): String =
    appInfo(pkg)?.let { context.packageManager.getApplicationLabel(it).toString() } ?: pkg

  private fun isGame(pkg: String): Boolean {
    val info = appInfo(pkg) ?: return false
    return info.category == ApplicationInfo.CATEGORY_GAME || (info.flags and ApplicationInfo.FLAG_IS_GAME) != 0
  }
}
