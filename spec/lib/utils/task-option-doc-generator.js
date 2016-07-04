// Copyright 2016, EMC

'use strict';

describe("Task Option Doc Generator", function () {
    var taskOptionValidator;
    var fs = require('fs');

    before(function() {
        helper.setupInjector([
            helper.require('/lib/utils/task-option-validator')
        ]);
    });

    beforeEach(function () {
        taskOptionValidator = helper.injector.get('TaskOption.Validator');
    });


    function mergeAllOf (obj) {
        if (obj.allOf && obj.allOf instanceof Array) {
            var all = {};
            _.forEach(obj.allOf, function (item) {
                if(item.allOf) {
                    item = mergeAllOf(item);
                }
                _.merge(all, item);
            });
            delete obj.allOf;
            _.merge(obj, all);
        }

        _.forOwn(obj, function(val) {
            if (val instanceof Object) {
                mergeAllOf(val);
            }
        });

        return obj;
    }

    function generateDocData (obj, dataTemplate) {
        var data = {
            type: obj.type,
            description: obj.description,
            url: dataTemplate.url,
            name: dataTemplate.name,
            title: dataTemplate.title, 
            version: '0.0.0',
            group: dataTemplate.group,
            groupTitle: dataTemplate.groupTitle,
            parameter: {
                fields: {}
            }  
        };

        function getProp(obj) {
            return obj.properties || _.get(obj, 'items.properties') ||
                obj.oneOf || obj.anyOf;
        }
        
        var subItems =[];
        data.parameter.fields.properties = [];

        _.forEach(getProp(obj), function (option, name) {
            var subProp = getProp(option);
            var subTemp = {};
            if (subProp) {
                subTemp = {
                    url: data.url + '/' + name,
                    name: data.name + '_' + name,
                    title: data.title + '.' + name,
                    group: data.group,
                    groupTitle: data.groupTitle
                };
                subItems = subItems.concat(generateDocData(option, subTemp));
            }

            var fieldTemp = {
                group: 'g1', // TODO: find out gourp usage
                type: option.type,
                optional: _.indexOf(obj.required, name) < 0,
                field: name + '',
                description: '<p>' + option.description + '</p>'
            };

            _.forOwn(option, function (val, key) {
                if (key !== 'type' && key !== 'description') {
                    fieldTemp.description += '<p>' + key + ':<code>' + val +'</code></p>';
                }
            });

            if (subProp) {
                fieldTemp.description += '<p>See details for <a href="#api-' +
                    subTemp.group + '-' + subTemp.name + '">' + name +'</a></p>';
            }

            data.parameter.fields.properties.push(fieldTemp);
        });

        return [data].concat(subItems);
    }

    it('should generate doc data', function () {
        return taskOptionValidator.register()
        .then(function () {
            var baseId = 'rackhd/schemas/v1/tasks/';
            // TODO: move the list to config
            var schemaIds = [
                'install-os-general',
                'install-centos',
                'install-coreos',
                'obm-control'
            ];
            var docData = [];

            _.forEach(schemaIds, function(id) {
                var schemaResolved = taskOptionValidator
                    .getSchemaResolved(baseId + id);
                var schemaMerged = mergeAllOf(schemaResolved);
                // var ns = schemaMerged.id.split('/');
                // var name = ns[ns.length - 1]; 
                var dataTemplate = {
                    url: '/' + id,
                    name: 'option',
                    title: 'option',
                    group: id,
                    groupTitle: schemaMerged.title
                };

                var data = generateDocData(schemaMerged, dataTemplate);
                docData = docData.concat(data);                
            });

            // console.log(JSON.stringify(docData));
            fs.writeFileSync('task_doc_data.json', JSON.stringify(docData));
        });
    });

    /*
    it('should load all JSON schemas in task folder', function() {
        return taskOptionValidator.register()
        .then(function () {
            var install_os_general = taskOptionValidator
                .getSchema('rackhd/schemas/v1/tasks/install-os-general');
            var install_os_general_origin = _.cloneDeep(install_os_general);
            var install_os_general_resolved = taskOptionValidator
                .getSchemaResolved('rackhd/schemas/v1/tasks/install-os-general');
            install_os_general = taskOptionValidator
                .getSchema('rackhd/schemas/v1/tasks/install-os-general');
            expect(install_os_general).to.deep.equal(install_os_general_origin);
        });
    });
    */
});
