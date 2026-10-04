const { handleRevitTool } = require('../modules/revit');

async function inspectDoc() {
  console.log('--- KIEM TRA TOAN BO CAC DOI TUONG HIEN CO TRONG VP BCH.rvt ---');
  const script = `
levels = [l.Name for l in DB.FilteredElementCollector(doc).OfClass(DB.Level)]
grids = [g.Name for g in DB.FilteredElementCollector(doc).OfClass(DB.Grid)]
floors = [f.Id.IntegerValue for f in DB.FilteredElementCollector(doc).OfClass(DB.Floor)]
walls = [w.Id.IntegerValue for w in DB.FilteredElementCollector(doc).OfClass(DB.Wall)]

print("Levels: " + str(levels))
print("Grids: " + str(grids))
print("Floors count: " + str(len(floors)))
print("Walls count: " + str(len(walls)))

__result__ = {
    "levels": levels,
    "grids": grids,
    "floors_count": len(floors),
    "walls_count": len(walls)
}
`;

  const res = await handleRevitTool('revit_execute_python', {
    script: script,
    auto_transaction: false,
    transaction_name: 'Inspect All Elements'
  });
  console.log(JSON.stringify(res, null, 2));
}

inspectDoc();
