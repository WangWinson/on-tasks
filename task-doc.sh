_mocha 'spec/lib/utils/task-option-doc-generator.js' --require spec/helper

echo 'define({"api":' > api_data.js

cat task_doc_data.json | python -m json.tool >> api_data.js

echo '});' >> api_data.js

cp api_data.js ../on-http/build/apidoc

