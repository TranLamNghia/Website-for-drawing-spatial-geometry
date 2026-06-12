const fs = require('fs');

const geometryContextPath = 'c:\\\\Users\\\\Tln.Ganyu\\\\Desktop\\\\SpatialGeometry\\\\frontend\\\\components\\\\geometry\\\\geometry-context.tsx';
let content = fs.readFileSync(geometryContextPath, 'utf8');

// The replacement contents
let createBoxReplacement = fs.readFileSync('./replace_box.js', 'utf8');
createBoxReplacement = createBoxReplacement.split("const createBoxReplacement = `")[1].split("`;")[0];

let createPyramidReplacement = fs.readFileSync('./replace_pyramid.js', 'utf8');
createPyramidReplacement = createPyramidReplacement.split("const createPyramidReplacement = `")[1].split("`;")[0];

let createPrismReplacement = fs.readFileSync('./replace_prism.js', 'utf8');
createPrismReplacement = createPrismReplacement.split("const createPrismReplacement = `")[1].split("`;")[0];

function replaceFunction(content, funcName, newFunc) {
  const startStr = "  const " + funcName + " = useCallback(";
  const endStr = "    [commitManualDocument, manualDocument, saveManualState],\n  )";
  const endStr2 = "    [commitManualDocument, manualDocument.solids.length],\n  )";
  const endStr3 = "    [commitManualDocument, saveManualState],\n  )";

  const startIndex = content.indexOf(startStr);
  if (startIndex === -1) {
    console.log("Could not find " + funcName);
    return content;
  }

  let endIndex = content.indexOf(endStr, startIndex);
  if (endIndex === -1) endIndex = content.indexOf(endStr2, startIndex);
  if (endIndex === -1) endIndex = content.indexOf(endStr3, startIndex);

  if (endIndex === -1) {
    console.log("Could not find end of " + funcName);
    return content;
  }

  let realEndIndex = content.indexOf(')', endIndex) + 1;
  
  console.log("Replacing " + funcName);
  return content.substring(0, startIndex) + newFunc + content.substring(realEndIndex);
}

content = replaceFunction(content, 'createBox', createBoxReplacement);
content = replaceFunction(content, 'createPyramid', createPyramidReplacement);
content = replaceFunction(content, 'createPrism', createPrismReplacement);

fs.writeFileSync(geometryContextPath, content);
console.log('Replaced successfully.');
