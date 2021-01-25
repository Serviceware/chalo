(function chalo() {
  const { exec } = require('child_process');
  const fs = require('fs');
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

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
    const type = await getUserInput(`type(${JSON.stringify(settings.types).replace(/['"]+/g, '')}): `);
    const title = await getUserInput('title: ');
    const description = await getUserInput('description: ');
    console.log(type, title, description);
    readline.close();
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
    userLogs.push({ type, title, description });
    fs.writeFileSync(filePath, JSON.stringify(userLogs));
    console.log('Log file created.');
    console.log(filePath);
    try {
      exec('code ' + filePath);
    } catch (err) {}
  }

  function getUserInput(text) {
    return new Promise((res, rej) => {
      readline.question(text, (input) => {
        res(input);
      });
    });
  }

  function generateChangelog(header, removeAfter) {
    fs.readdir(settings.logsFolderPath, { withFileTypes: true }, (err, files) => {
      console.log('\nCurrent directory files:');
      if (err) console.log(err);
      else {
        let changelog = settings.template.header.replace();
        const logs = [];
        files.forEach((file) => {
          const filenameSplit = file.name.split('.');
          if (!file.isFile || filenameSplit[filenameSplit.length - 1] !== 'json') return;
          console.log(file.name);

          const logStr = fs.readFileSync(settings.logsFolderPath + '/' + file.name, { encoding: 'utf8', flag: 'r' });
          logs.push(parseLog(JSON.parse(logStr)));
        });
        logs.sort(); // sort alphabetically
        logs.forEach((l) => (changelog += '\n' + l));
        console.log(changelog);
      }
    });
  }

  function parseLog(logObj) {
    const log = settings.template.log;
    log = log.replace('{{type}}', logObj.type ?? '');
    log = log.replace('{{title}}', logObj.title ?? '');
    log = log.replace('{{description}}', logObj.description ?? '');
    return log;
  }

  function getUsername() {
    const usernameOs = require('os').userInfo().username;
    const userNameEnv = process.env['USERPROFILE'].split(path.sep)[2];
    return usernameOs || userNameEnv;
  }

  function publishNewVersion(){
      
  }
})();
