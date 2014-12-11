module.exports = (grunt) ->

	grunt.initConfig
		pkg: grunt.file.readJSON 'package.json'
		watch:
			test:
				files: ['*.js', 'tests/*.coffee', '!tests/all.coffee']
				tasks: ['test']
		concat:
			test:
				files:
					'tests/all.coffee': ['tests/*.coffee', '!tests/all.coffee']
		coffee:
			test:
				files:
					'tests/all.js': ['tests/all.coffee']
		connect:
			server:
				options:
					hostname: process.env.IP || '0.0.0.0'
					port: process.env.PORT || 8000
					base: "."
		mocha_phantomjs:
			altl:
				options:
					urls: ['http://' + 
					       (process.env.C9_HOSTNAME || '0.0.0.0:8000') +
					       '/tests/index.html']
		copy:
			main:
				files: [
						src: ['<%=pkg.main%>']
						dest: 'dist/<%=pkg.name%>.js'
					]
		uglify:
			options:
				sourceMap: true
			main:
				files:
					'dist/<%=pkg.name%>.min.js': ['dist/<%=pkg.name%>.js']
		clean:
			test: ['tests/all.*']
			release: ['dist']	

	grunt.loadNpmTasks 'grunt-contrib-connect'
	grunt.loadNpmTasks 'grunt-mocha-phantomjs'
	grunt.loadNpmTasks 'grunt-contrib-copy'
	grunt.loadNpmTasks 'grunt-contrib-uglify'
	grunt.loadNpmTasks 'grunt-contrib-coffee'
	grunt.loadNpmTasks 'grunt-contrib-concat'
	grunt.loadNpmTasks 'grunt-contrib-clean'
	grunt.loadNpmTasks 'grunt-contrib-watch'

	grunt.registerTask 'test', [ 'concat:test', 'coffee:test'
	                             'connect', 'mocha_phantomjs'
	                             'clean:test' ]
	grunt.registerTask 'release', ['copy', 'uglify']
	grunt.registerTask 'default', ['watch:test']
