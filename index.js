(function chalo() {
  const { exec } = require('child_process');
  const fs = require('fs');

  const settings = JSON.parse(fs.readFileSync('./chalo.json'));

  var args = process.argv.slice(2);
  console.log(args);

  switch (args[0]) {
    case 'a':
    case 'add':
      addNewLog();
      break;
    case 'g':
    case 'generate':
      generateChangelog(args.includes('rm'));
      break;
    case 'p':
    case 'publish':
      publishNewVersion(args.includes('rm'));
      break;
    default:
      console.log('"a" or "add" to add new log.');
      console.log('"g" or "generate" to generate the CHANGELOG.md.');
      console.log('"p" or "publish" to publish a new version.');
  }

  async function addNewLog() {
    const username = getUsername();
    const filePath = `${settings.logsFolderPath}/${username}.json`;
    let userLogFile = '[]';
    try {
      userLogFile = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
    } catch (error) {}
    let userLogs = JSON.parse(userLogFile) || [];
    if (!Array.isArray(userLogs)) {
      throw 'User log file must contain array of logs.';
    }
    const userLog = getLogInfoFromUserInput();
    userLogs.push(userLog);
    fs.writeFileSync(filePath, JSON.stringify(userLogs));
    console.log('Log file created.');
    console.log(filePath);
    try {
      exec('code ' + filePath);
    } catch (err) {}
  }

  async function getLogInfoFromUserInput() {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const type = await getUserInput(readline, `type(${JSON.stringify(settings.types).replace(/['"]+/g, '')}): `);
    const title = await getUserInput(readline, 'title: ');
    const description = await getUserInput(readline, 'description: ');
    console.log(type, title, description);
    readline.close();
    return { type, title, description };
  }
  
  function getUserInput(readline, text) {
    return new Promise((res, rej) => {
      readline.question(text, (input) => {
        res(input);
      });
    });
  }

  function generateChangelog() {
    fs.readdir(settings.logsFolderPath, { withFileTypes: true }, (err, files) => {
      console.log('\nCurrent directory files:');
      if (err) console.error(err);
      else {
        const logsByVersion = {};
        const oncomingLogs = [];
        files.forEach((file) => {
          const filenameSplit = file.name.split('.');
          if (!file.isFile || filenameSplit[filenameSplit.length - 1] !== 'json') return;
          console.log(file.name);

          const userLogs = JSON.parse(fs.readFileSync(settings.logsFolderPath + '/' + file.name, { encoding: 'utf8', flag: 'r' }));
          userLogs.forEach((ul) => {
            if (!ul.version) {
              oncomingLogs.push(ul);
            } else {
              logsByVersion[ul.version] = logsByVersion[ul.version] ?? [];
              logsByVersion[ul.version].push(ul);
            }
          });
        });
        console.log(logsByVersion);
        const versions = Object.keys(logsByVersion).map((version) => ({ version, logs: logsByVersion[version] }));
        versions.sort((a, b) => a.version - b.version); // sort alphabetically
        versions.splice(0, 0, { version: 'oncoming', logs: oncomingLogs });
        console.log(versions);
        const template = fs.readFileSync(settings.logsFolderPath + '/template.md', { encoding: 'utf8', flag: 'r' });
        const changelog = parseVersions(versions, template);
        fs.writeFileSync(settings.logsFolderPath + '/../CHANGELOG.md', changelog);
        console.log('Generated CHANGELOG.md');
      }
      return;
    });
  }

  function parseVersions(versions, template) {
    let headerTemp = getTemplatePart(template, 'HEADER');
    let logTemp = getTemplatePart(template, 'LOG');
    let footerTemp = getTemplatePart(template, 'FOOTER');

    let changelogArray = [];

    versions.forEach((v) => {
      const headerKeyValues = [];
      if (v.version && v.version !== 'oncoming') {
        headerKeyValues.push({ key: 'version', value: v.version });
      }
      const header = applyValues(headerTemp, headerKeyValues);
      changelogArray.push(header);
      v.logs.forEach((log) => {
        console.log(log);
        const logKeyValues = [];
        logKeyValues.push({ key: 'type', value: log.type });
        logKeyValues.push({ key: 'title', value: log.title });
        logKeyValues.push({ key: 'description', value: log.description });
        const logStr = applyValues(logTemp, logKeyValues);
        changelogArray.push(logStr);
      });
      const footer = applyValues(footerTemp, []);
      changelogArray.push(footer);
    });
    return changelogArray.join('');
  }

  function applyValues(template, keyValues) {
    console.info(keyValues);
    keyValues.forEach((kv) => {
      if (kv.value) template = replaceAll(template, `{{${kv.key}}}`, kv.value);
    });
    Object.keys(settings.defaultValues).forEach((defaultKey) => {
      template = replaceAll(template, `{{${defaultKey}}}`, settings.defaultValues[defaultKey]);
    });
    return template;
  }

  function replaceAll(str, match, replacement) {
    return str.split(match).join(replacement);
  }

  function getTemplatePart(template, partName) {
    const indexStart = template.indexOf(`{{${partName}}}`) + partName.length + 4;
    const indexEnd = template.indexOf(`{{/${partName}}}`);
    return template.substring(indexStart, indexEnd);
  }

  function getUsername() {
    const usernameOs = require('os').userInfo().username;
    const userNameEnv = process.env['USERPROFILE'].split(path.sep)[2];
    return usernameOs || userNameEnv;
  }

  function publishNewVersion() {}
})();
