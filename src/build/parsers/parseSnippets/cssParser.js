import { red } from 'kleur';
import sass from 'node-sass';
import { determineExpertiseFromTags } from 'build/transformers';
import {
  getFilesInDir,
  getData,
  getTextualContent,
  getGitMetadata,
  getId,
  getTags
} from './standardParser';

/**
 * Gets the code blocks for a snippet.
 * @param str The snippet's raw content.
 * @param config The project's configuration file.
 */
const getCodeBlocks = (str, config) => {
  const regex = /```[.\S\s]*?```/g;
  let results = [];
  let m = null;
  while ((m = regex.exec(str)) !== null) {
    if (m.index === regex.lastIndex) regex.lastIndex += 1;

    // eslint-disable-next-line
    m.forEach(match => {
      results.push(match);
    });
  }
  const replacer = new RegExp(`\`\`\`${config.language.short}([\\s\\S]*?)\`\`\``, 'g');
  const secondReplacer = new RegExp(`\`\`\`${config.secondLanguage.short}([\\s\\S]*?)\`\`\``, 'g');
  const optionalReplacer = new RegExp(`\`\`\`${config.optionalLanguage.short}([\\s\\S]*?)\`\`\``, 'g');
  results = results.map(v =>
    v
      .replace(replacer, '$1')
      .replace(secondReplacer, '$1')
      .replace(optionalReplacer, '$1')
      .trim()
  );
  if (results.length > 2) {
    return {
      html: results[0],
      css: results[1],
      js: results[2],
    }
    ;
  }
  return {
    html: results[0],
    css: results[1],
    js: '',
  };
};

/**
 * Synchronously read all snippets and sort them as necessary.
 * The sorting is case-insensitive.
 * @param snippetsPath The path of the snippets directory.
 */
const readSnippets = async(snippetsPath, config) => {
  const snippetFilenames = getFilesInDir(snippetsPath, false);

  let snippets = {};
  try {
    for (let snippet of snippetFilenames) {
      let data = getData(snippetsPath, snippet);
      const tags = getTags(data.attributes.tags);
      const text = getTextualContent(data.body);

      snippets[snippet] = {
        id: getId(snippet),
        title: data.attributes.title,
        type: 'snippet',
        tags: {
          all: tags,
          primary: tags[0],
        },
        code: getCodeBlocks(data.body, config),
        expertise: determineExpertiseFromTags(tags),
        text: {
          full: text,
          short: text.slice(0, text.indexOf('\n\n')),
        },
        ...await getGitMetadata(snippet, snippetsPath),
      };
      snippets[snippet].code.scopedCss = sass
        .renderSync({
          data: `[data-scope="${snippets[snippet].id}"] { ${snippets[snippet].code.css} }`,
        })
        .css.toString();
    }
  } catch (err) {
    /* istanbul ignore next */
    console.log(`${red('[ERROR]')} Error while reading snippets: ${err}`);
    /* istanbul ignore next */
    process.exit(1);
  }
  return snippets;
};

export default {
  getFilesInDir,
  getData,
  getTextualContent,
  getGitMetadata,
  getId,
  getTags,
  getCodeBlocks,
  readSnippets,
};