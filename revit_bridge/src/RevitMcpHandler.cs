using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Autodesk.Revit.UI;
using Autodesk.Revit.DB;

namespace RevitMCPBridge
{
    public class McpTaskItem
    {
        public Func<UIApplication, object> Action { get; set; }
        public TaskCompletionSource<object> Tcs { get; set; }
    }

    public class RevitMcpHandler : IExternalEventHandler
    {
        private readonly ConcurrentQueue<McpTaskItem> _queue = new ConcurrentQueue<McpTaskItem>();

        public Task<object> EnqueueTask(Func<UIApplication, object> action)
        {
            var tcs = new TaskCompletionSource<object>();
            _queue.Enqueue(new McpTaskItem { Action = action, Tcs = tcs });
            return tcs.Task;
        }

        public void Execute(UIApplication app)
        {
            McpTaskItem item;
            while (_queue.TryDequeue(out item))
            {
                try
                {
                    object result = item.Action(app);
                    item.Tcs.TrySetResult(result);
                }
                catch (Exception ex)
                {
                    item.Tcs.TrySetException(ex);
                }
            }
        }

        public string GetName()
        {
            return "AntigravityRevitMcpHandler";
        }
    }
}
