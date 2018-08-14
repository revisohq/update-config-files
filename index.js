const fs = require('fs')
const path = require('path')
const yargs = require('yargs')

const args = yargs
	.usage('$0 --config <path-to-config> --set <config>=<value> [--set ...]')
	.option('config', {
		description: 'The path to a config file. See config.example.json for a sample config file',
		config: true,
		configParser: function (configPath) {
			return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
		},
	})
	.command(
		'set <values..>',
		'Update individual values',
		yargs => yargs.positional('values', {
			description: 'One or more values in the format key=value.',
			type: 'array',
			coerce: (fromCLI) => {
				if(!Array.isArray(fromCLI)) {
					return fromCLI
				}

				const values = {}
				for(const val of fromCLI) {
					if(typeof val !== 'string') {
						Object.assign(values, val)
						continue
					}
					const [ key, ...rest ] = val.split('=')
					values[key] = rest.join('=')
				}
				return values
			},
		}),
	)
	.command(
		'preset <preset>',
		'A preset that can be stored in the config file',
	)
	.option('files', {
		description: 'The files to update. This should be given as part of the config. See config.example.json for examples.',
		group: 'Config file',
	})
	.option('presets', {
		description: 'The list of presets.',
		group: 'Config file',
		default: {},
	})
	.demandOption(['files', 'config'])
	.demandCommand(1, 'You need to set a command')
	.strict()
	.argv

let set
switch(args._[0]) {
case 'set': {
	set = args.values
	break
}
case 'preset': {
	set = args.presets[args.preset]
	if(!set) {
		console.log('Unknown preset: ' + args.preset)
		console.log('Available presets:')
		console.log(Object.keys(args.presets).join(' '))
		process.exit(1)
	}
	break
}
default:
	console.log('Unknown command: ' + args._[0])
	process.exit(1)
}

for(const { file, config } of args.files) {
	updateFile(file, config, set)
}

function updateFile(file, config, set) {
	const filename = file
	const originalContent = fs.readFileSync(filename, 'utf-8')
	const newContent = Object.entries(set)
		.reduce((content, [ configKey, newValue ]) => {
			const configuration = config[configKey]
			if(!configuration) {
				return content
			}
			const { key, type } = configuration
			switch(type) {
			case 'appSetting':
				return updateAppSetting(content, key, newValue)
			case 'connectionString':
				return updateConnectionString(content, key, newValue)
			default:
				return content
			}
		}, originalContent)

	fs.writeFileSync(filename, newContent)
	console.log('updated ' + file)
}

function updateAppSetting(content, key, newValue) {
	return updateXMLAttribute(
		content,
		'appSettings',
		{
			attribute: 'key',
			value: key,
		},
		{
			attribute: 'value',
			value: newValue,
		},
	)
}
function updateConnectionString(content, key, newValue) {
	return updateXMLAttribute(
		content,
		'connectionStrings',
		{
			attribute: 'name',
			value: key,
		},
		{
			attribute: 'connectionString',
			value: newValue,
		},
	)
}

function updateXMLAttribute(content, containerTag, definition, value) {
	const property = findProperty(content, containerTag, `${definition.attribute}="${definition.value}"`)
	if(property == null) {
		return content
	}

	const { startOfTag, endOfTag } = property
	const startOfValueProp = content.indexOf(value.attribute + '="', startOfTag)
	const startOfValue = content.indexOf('"', startOfValueProp) + 1
	const endOfValue = content.indexOf('"', startOfValue)

	return replace(content, startOfValue, endOfValue, value.value)
}

function replace(str, contentStart, contentEnd, newContent) {
	const before = str.slice(0, contentStart)
	const after = str.slice(contentEnd)
	return before + newContent + after
}

function findFirstNonCommentedOccurence(content, value, fromIndex, toIndex) {
	const startOfKey = content.indexOf(value, fromIndex)
	if(startOfKey === -1 || startOfKey > toIndex) {
		return null
	}

	const commentStart = content.lastIndexOf('<!--', startOfKey)
	if(commentStart === -1) {
		return startOfKey
	}
	const commentEnd = content.lastIndexOf('-->', startOfKey)
	return commentStart < commentEnd
	? startOfKey
	: findFirstNonCommentedOccurence(content, value, startOfKey + value.length)
}
function findProperty(content, containerTag, value) {
	const startBound = content.indexOf(`<${containerTag}`)
	const endBound = content.indexOf(`</${containerTag}>`)
	if(startBound === -1 || endBound === -1) {
		return null
	}

	const startOfKey = findFirstNonCommentedOccurence(content, value, startBound, endBound)
	if(startOfKey == null) {
		return null
	}

	const startOfTag = content.lastIndexOf('<add', startOfKey)
	const endOfTag = content.indexOf('/>', startOfKey)
	return { startOfTag, endOfTag }
}
