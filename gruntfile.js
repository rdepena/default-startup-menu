module.exports = function(grunt) {
  var sourceFiles = ['src/**/*.js'];
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat : {
      options : {},
      dist : {
        src : sourceFiles,
        dest: 'js/dist/launcher.js'
      }
    },
    watch: {
      files: sourceFiles,
      tasks: ['jshint','concat']
    },
    jshint: {
      // define the files to lint
      files: ['gruntfile.js', 'src/**/*.js'],
      options: {}
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['jshint', 'concat']);
};
