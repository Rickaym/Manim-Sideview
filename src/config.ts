import * as vscode from "vscode";
import { join } from "path";
import {
  ContextVars,
  BASE_ARGS,
  BASE_MEDIA_DIR,
  BASE_VIDEO_DIR,
  getNonce,
  getWebviewResource,
  insertContext,
  RunningConfig,
  WebviewResources,
} from "./globals";

export class DueTimeConfiguration {
  constructor(
    public readonly ctx: vscode.ExtensionContext,
    public readonly extensionUri: vscode.Uri = ctx.extensionUri,
    public readonly disposables: any[] = ctx.subscriptions
  ) {
    this.setup();
  }
  private panel: vscode.WebviewPanel | undefined;
  private htmlDoc: string | undefined;

  private loads: WebviewResources = getWebviewResource(
    this.extensionUri,
    "config"
  );

  async setup(): Promise<string> {
    this.htmlDoc = (
      await vscode.workspace.fs.readFile(this.loads.html)
    ).toString();
    return this.htmlDoc;
  }

  async show(conf: RunningConfig) {
    if (this.panel) {
      vscode.window.showErrorMessage(
        "You cannot open multiple configuration panels at the same time."
      );
      return;
    }

    if (!this.htmlDoc) {
      var htmlDoc = await this.setup();
    } else {
      var htmlDoc = this.htmlDoc;
    }
    this.panel = vscode.window.createWebviewPanel(
      "inTimeConfiguration",
      "In Time Configurations",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
      }
    );

    this.panel.iconPath = vscode.Uri.joinPath(
      this.extensionUri,
      "assets/images/settings.png"
    );

    const vars: ContextVars = {
      "%cspSource%": this.panel.webview.cspSource,
      "%nonce%": getNonce(),
      "%args%":
        conf.args ||
        vscode.workspace
          .getConfiguration("manim-sideview")
          .get("commandLineArgs") ||
        BASE_ARGS,
      "%video_dir%":
        conf.videoDir ||
        vscode.workspace
          .getConfiguration("manim-sideview")
          .get("videoDirectory") ||
        BASE_VIDEO_DIR,
      "%scene_name%": conf.sceneName,
      "%media_dir%":
        conf.mediaDir ||
        vscode.workspace
          .getConfiguration("manim-sideview")
          .get("mediaDirectory") ||
        BASE_MEDIA_DIR,
        "config.css": this.panel.webview.asWebviewUri(this.loads.css).toString(),
        "config.js": this.loads.js.with({ scheme: "vscode-resource" }).toString()
    };

    this.panel.webview.html = insertContext(vars, htmlDoc);

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "dispose":
            if (this.panel) {
              this.panel.dispose();
            }
            return;
          case "configure":
            if (this.panel) {
              conf.args = message.args;
              conf.sceneName = message.sceneName;
              conf.videoDir = message.videoDir;
              conf.output = join(message.videoDir, conf.sceneName + ".mp4");
              this.panel.dispose();
            }
            return;
        }
      },
      undefined,
      this.disposables
    );
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      undefined,
      this.disposables
    );
  }
}
