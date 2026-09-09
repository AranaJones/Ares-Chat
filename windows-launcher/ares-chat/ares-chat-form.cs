using System.Diagnostics;

namespace ares_chat;

public partial class AresChatForm : Form
{
    public AresChatForm()
    {
        InitializeComponent();
    }

    private void launchButton_Click(object? sender, EventArgs e)
    {
        try
        {
            var launchTarget = FindLaunchTarget();
            if (launchTarget is null)
            {
                var message = "Could not find a built Ares Chat executable or the ares-ai-chat-desktop source folder. Build the Electron app or keep this launcher in the repository checkout.";
                statusLabel.Text = $"Status: {message}";
                MessageBox.Show(message, "Ares Chat Launcher", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            Process.Start(launchTarget.StartInfo);
            statusLabel.Text = $"Status: Started {launchTarget.Description}.";
        }
        catch (Exception ex)
        {
            var message = $"Launch failed: {ex.Message}";
            statusLabel.Text = $"Status: {message}";
            MessageBox.Show(message, "Ares Chat Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static LaunchTarget? FindLaunchTarget()
    {
        foreach (var root in EnumerateSearchRoots(AppContext.BaseDirectory))
        {
            var packagedExecutable = Path.Combine(root, "ares-ai-chat-desktop", "dist", "win-unpacked", "Ares Chat.exe");
            if (File.Exists(packagedExecutable))
            {
                return new LaunchTarget(
                    new ProcessStartInfo
                    {
                        FileName = packagedExecutable,
                        WorkingDirectory = Path.GetDirectoryName(packagedExecutable) ?? root,
                        UseShellExecute = true
                    },
                    "the packaged desktop app");
            }

            var desktopDirectory = Path.Combine(root, "ares-ai-chat-desktop");
            var packageJson = Path.Combine(desktopDirectory, "package.json");
            if (File.Exists(packageJson))
            {
                return new LaunchTarget(
                    new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c npm start",
                        WorkingDirectory = desktopDirectory,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    },
                    "the desktop app from source");
            }
        }

        return null;
    }

    private static IEnumerable<string> EnumerateSearchRoots(string startDirectory)
    {
        for (var current = new DirectoryInfo(startDirectory); current is not null; current = current.Parent)
        {
            yield return current.FullName;
        }
    }

    private sealed record LaunchTarget(ProcessStartInfo StartInfo, string Description);
}
