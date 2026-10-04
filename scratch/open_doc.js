const { handleRevitTool } = require('../modules/revit');

async function openProject() {
  console.log('--- MO DU AN VP BCH.rvt QUA PYREVIT (PORT 9878) ---');
  const script = `
import clr
clr.AddReference('RevitAPI')
clr.AddReference('RevitAPIUI')
import Autodesk.Revit.DB as DB

path = r"C:\\Users\\MAI KHANH\\Downloads\\BPTC SKETCHUP\\MODEL\\VP BCH.rvt"
try:
    if uiapp.ActiveUIDocument and uiapp.ActiveUIDocument.Document.PathName == path:
        print("Document already open: " + uiapp.ActiveUIDocument.Document.Title)
        __result__ = {"opened": True, "title": uiapp.ActiveUIDocument.Document.Title}
    else:
        open_opt = DB.OpenOptions()
        uidoc = uiapp.OpenAndActivateDocument(path)
        print("Opened successfully: " + uidoc.Document.Title)
        __result__ = {"opened": True, "title": uidoc.Document.Title}
except Exception as e:
    import traceback
    print("Error: " + str(e))
    print(traceback.format_exc())
    __result__ = {"opened": False, "error": str(e)}
`;

  const res = await handleRevitTool('revit_execute_python', {
    script: script,
    auto_transaction: false,
    transaction_name: 'Open VP BCH Document'
  });
  console.log(JSON.stringify(res, null, 2));
}

openProject();
