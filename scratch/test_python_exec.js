const { handleRevitTool } = require('../modules/revit');

async function testPython() {
  const script = `
print("--- TEST DIRECT PYTHON ---")
print("Doc title: " + doc.Title)
levels = [l.Name for l in DB.FilteredElementCollector(doc).OfClass(DB.Level)]
grids = [g.Name for g in DB.FilteredElementCollector(doc).OfClass(DB.Grid)]
floors = [f.Id.IntegerValue for f in DB.FilteredElementCollector(doc).OfClass(DB.Floor)]

print("Levels: " + ", ".join(levels))
print("Grids count: " + str(len(grids)))
print("Floors count: " + str(len(floors)))

__result__ = {
    "title": doc.Title,
    "levels": levels,
    "grids": grids,
    "floors_count": len(floors)
}
`;

  const res = await handleRevitTool('revit_execute_python', {
    script: script,
    auto_transaction: false,
    transaction_name: 'Inspect via Python'
  });
  console.log(JSON.stringify(res, null, 2));
}

testPython();
