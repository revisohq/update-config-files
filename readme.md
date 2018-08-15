update-web-config
=================

A convenience helper for updating web.config values. It makes it simpler to
update multiple Web.config files simultaneously.


Setup
-----

1. Copy the config.example.json somewhere.
2. Edit the copy to have the proper URLs for the files. Add any additional keys, if required.
3. Consider the most common changes, and add them as presets.

Usage
-----

1. For a unique or simple change, use `update-web-config --config <config-file> set <key>='<value>'`
2. For common replacements, use `update-web-config --config <config-file> preset <preset-name>`
