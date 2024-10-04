module.exports = {
  git: {
    commitMessage: 'chore(release): ${version}',
  },
  github: {
    release: true,
    releaseNotes(context) {
      const date = new Date();
      const yyyy = date.getFullYear().toString();
      const MM = (date.getMonth() + 1).toString().padStart(2, '0');
      const dd = date.getDate().toString().padStart(2, '0');

      const title = `## ${yyyy}-${MM}-${dd}`;

      return [title, context.changelog].join('\n\n\n');
    },
  },
};
