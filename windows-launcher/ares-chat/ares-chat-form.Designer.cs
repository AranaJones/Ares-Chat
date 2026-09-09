namespace ares_chat;

partial class AresChatForm
{
    private System.ComponentModel.IContainer components = null;
    private Label headingLabel = null!;
    private Label detailsLabel = null!;
    private Button launchButton = null!;
    private Label statusLabel = null!;

    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null))
        {
            components.Dispose();
        }

        base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
        headingLabel = new Label();
        detailsLabel = new Label();
        launchButton = new Button();
        statusLabel = new Label();
        SuspendLayout();
        // 
        // headingLabel
        // 
        headingLabel.AutoSize = true;
        headingLabel.Font = new Font("Segoe UI", 14F, FontStyle.Bold);
        headingLabel.Location = new Point(20, 18);
        headingLabel.Name = "headingLabel";
        headingLabel.Size = new Size(222, 25);
        headingLabel.TabIndex = 0;
        headingLabel.Text = "Ares Chat for Windows";
        // 
        // detailsLabel
        // 
        detailsLabel.Location = new Point(20, 56);
        detailsLabel.Name = "detailsLabel";
        detailsLabel.Size = new Size(392, 54);
        detailsLabel.TabIndex = 1;
        detailsLabel.Text = "This basic launcher starts the existing Ares Chat desktop app. It prefers a built Windows executable and falls back to npm start in the repository checkout.";
        // 
        // launchButton
        // 
        launchButton.Location = new Point(20, 120);
        launchButton.Name = "launchButton";
        launchButton.Size = new Size(170, 34);
        launchButton.TabIndex = 2;
        launchButton.Text = "Launch Ares Chat";
        launchButton.UseVisualStyleBackColor = true;
        launchButton.Click += launchButton_Click;
        // 
        // statusLabel
        // 
        statusLabel.Location = new Point(20, 170);
        statusLabel.Name = "statusLabel";
        statusLabel.Size = new Size(392, 54);
        statusLabel.TabIndex = 3;
        statusLabel.Text = "Status: Ready to launch.";
        // 
        // AresChatForm
        // 
        AcceptButton = launchButton;
        AutoScaleDimensions = new SizeF(7F, 15F);
        AutoScaleMode = AutoScaleMode.Font;
        ClientSize = new Size(434, 241);
        Controls.Add(statusLabel);
        Controls.Add(launchButton);
        Controls.Add(detailsLabel);
        Controls.Add(headingLabel);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        Name = "AresChatForm";
        StartPosition = FormStartPosition.CenterScreen;
        Text = "Ares Chat Launcher";
        ResumeLayout(false);
        PerformLayout();
    }
}
