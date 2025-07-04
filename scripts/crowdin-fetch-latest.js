const crowdinTranslations = require('@crowdin/crowdin-api-client').Translations;
const https = require('https');
const fs = require('fs');
const resolve = require('path').resolve;
const DecompressZip = require('decompress-zip');

// crowdin api key
const CROWDIN_TOKEN = process.env.CROWDIN_PERSONAL_TOKEN;
const CROWDIN_PROJECT_ID = 262825;

// initialization of crowdin client
const credentials = {
  token: CROWDIN_TOKEN
};

// create an instance of the crowdin client
const translationApi = new crowdinTranslations(credentials);

// paths
const zipFilePath = resolve('./alltx.zip');
const extractPath = resolve('./downloads');
const helpExtractPath = resolve('./src/translations/help');
const moreLanguagesExtractPath = resolve('./src/translations/moreLanguages');
const langExtractPath = resolve('./src/translations');
const cboardSrcPath = resolve('./src/translations/src/cboard.json');

const downloadCboardJson = onComplete => {
  console.log('Trying to download latest cboard.json...');

  const cboardJson = fs.createWriteStream(cboardSrcPath);
  https.get(
    `https://api.crowdin.com/api/project/cboard/export-file?file=cboard.json&language=en&key=${CROWDIN_API_KEY}`,
    function(response) {
      response.pipe(cboardJson);
      cboardJson.on('finish', function() {
        console.log('cboard.json download complete.');
        cboardJson.close(onComplete);
      });
      cboardJson.on('error', function(err) {
        console.log('cboard.json download encountered error!');
        console.log(err);
      });
    }
  );
};

const downloadTranslations = async onComplete => {
  console.log('Trying to download latest translation strings...');

  // get project build
  const build = await translationApi.listProjectBuilds(CROWDIN_PROJECT_ID);
  const buildId = build.data[0].data.id;
  const download = await translationApi.downloadTranslations(
    CROWDIN_PROJECT_ID,
    buildId
  );
  const allTxZip = fs.createWriteStream(zipFilePath);
  https.get(download.data.url, function(response) {
    response.pipe(allTxZip);
    allTxZip.on('finish', function() {
      console.log('Translation download complete.');
      allTxZip.close(onComplete);
    });
    allTxZip.on('error', function(err) {
      console.log('Translation download encountered error!');
      console.log(err);
    });
  });
};

const deleteTemporaryDownloadFile = () => {
  console.log('Deleting temp file.');
  try {
    fs.unlinkSync(zipFilePath);
    console.log(`Deleted ${zipFilePath}`);
  } catch (err) {
    console.error(`Error while deleting ${zipFilePath} ` + err.message);
  }
};

const extractTranslations = () => {
  console.log('Extracting zip to translations folder...');

  const unzipper = new DecompressZip(zipFilePath);

  unzipper.on('error', function(err) {
    console.log('DecompressZip Caught an error:', err);
  });

  unzipper.on('extract', function(log) {
    console.log('DecompressZip finished extracting.');
    //   const dirs = fs
    //     .readdirSync(langExtractPath, { withFileTypes: true })
    //     .filter(dirent => dirent.isDirectory())
    //     .map(dirent => dirent.name);
    //   //copy and rename help files
    //   dirs.forEach(dir => {
    //     fs.copyFileSync(
    //       `${langExtractPath}/${dir}/help/help.md`,
    //       `${helpExtractPath}/${dir}.md`
    //     );
    //   });
    //   dirs.forEach(dir => {
    //     fs.copyFileSync(
    //       `${langExtractPath}/${dir}/articles/moreLanguages.md`,
    //       `${moreLanguagesExtractPath}/${dir}.md`
    //     );
    //   });
    //   // delete directory recursively
    //   try {
    //     fs.rmdirSync(`${extractPath}/website`, { recursive: true });
    //     console.log(`website folder was deleted.`);
    //   } catch (err) {
    //     console.error(`Error while deleting ${extractPath}/website`);
    //   }
    deleteTemporaryDownloadFile();
    fs.readdirSync(extractPath).forEach(file => {
      if (file.endsWith('.json')) {
        fs.copyFileSync(`${extractPath}/${file}`, `${langExtractPath}/${file}`);
      }
    });
    //   //handle special cases for custom languages
    const custom = [
      {
        source: 'me-ME',
        dest: 'sr-ME'
      },
      {
        source: 'sr-CS',
        dest: 'sr-RS'
      },
      {
        source: 'tu-TI',
        dest: 'pt-TL'
      },
      {
        source: 'no-NO',
        dest: 'nb-NO'
      }
    ];
    custom.forEach(data => {
      fs.copyFileSync(
        `${extractPath}/${data.source}.json`,
        `${langExtractPath}/${data.dest}.json`
      );
      //fs.copyFileSync(
      //       `${helpExtractPath}/${data.source}.md`,
      //       `${helpExtractPath}/${data.dest}.md`
      //     );
    });
    try {
      fs.rm(`${extractPath}`, { recursive: true });
      console.log(`Download folder was deleted.`);
    } catch (err) {
      console.error(`Error while deleting ${extractPath}`);
    }
  });

  unzipper.on('progress', function(fileIndex, fileCount) {
    //console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
  });

  unzipper.extract({
    path: extractPath
  });
};

console.log('Pulling translations from CrowdIn...');
//downloadCboardJson(() => null);
downloadTranslations(extractTranslations);
