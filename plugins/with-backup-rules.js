// Android backup rules (APK 1.6.0+). Photos and expo-updates' downloaded bundles stay out of Google's cloud
// backup: past its 25 MB quota nothing at all is backed up. The AsyncStorage database (RKStorage, domain
// "database") stays in, since only <exclude> rules are used (one <include> would turn them into an allow-list).
// Also lifts AsyncStorage's database cap from its default 6 MB, which a few years of days would reach: once
// full, every save fails.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, withGradleProperties } = require('expo/config-plugins');

// Android 12+.
const DATA_EXTRACTION_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="file" path="photos/" />
    <exclude domain="file" path=".expo-internal/" />
  </cloud-backup>
  <device-transfer>
    <exclude domain="file" path=".expo-internal/" />
  </device-transfer>
</data-extraction-rules>
`;

// Android 11 and below (fullBackupContent).
const BACKUP_RULES = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="file" path="photos/" />
  <exclude domain="file" path=".expo-internal/" />
</full-backup-content>
`;

const DB_SIZE_KEY = 'AsyncStorage_db_size_in_MB';
const DB_SIZE_MB = '64';

function withBackupRules(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'spider_data_extraction_rules.xml'), DATA_EXTRACTION_RULES);
      fs.writeFileSync(path.join(dir, 'spider_backup_rules.xml'), BACKUP_RULES);
      return cfg;
    },
  ]);
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:allowBackup'] = 'true';
      app.$['android:dataExtractionRules'] = '@xml/spider_data_extraction_rules';
      app.$['android:fullBackupContent'] = '@xml/spider_backup_rules';
      // Ours win if a library's manifest brings its own rules (the merge would fail otherwise).
      const replace = new Set((app.$['tools:replace'] ?? '').split(',').filter(Boolean));
      replace.add('android:dataExtractionRules').add('android:fullBackupContent');
      app.$['tools:replace'] = [...replace].join(',');
    }
    return cfg;
  });
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((p) => !(p.type === 'property' && p.key === DB_SIZE_KEY));
    cfg.modResults.push({ type: 'property', key: DB_SIZE_KEY, value: DB_SIZE_MB });
    return cfg;
  });
}

module.exports = withBackupRules;
