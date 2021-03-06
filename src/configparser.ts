import * as vscode from "vscode";

/**
 * A minimal implementation to parse a toml subset of config files without any
 * type concern.
 * Only supports sectionalized key = value pairs and no type persistance.
 * The aim here is to parse out only necessary string type details.
 *
 *           CONFIG           ||              Captured Result
 * ---------------------------++------------------------------------
 * [Title]                    ||   { Title: {
 *  save_as_gif = True        ||      save_as_gif: "True",
 *  background_color = WHITE  ||      background_color: "WHITE";
 *                            ||   } }
 */

type Config = { [name: string]: { [name: string]: string } };

// [title]
const section = /^\[(?<title>\w+)\]$/g;
// key = value
const keyValPair = /^(?<key>\w+)\s*=\s*(?<value>.+)$/g;

export class ConfigParser {
  static async parse(uri: string): Promise<Config> {
    var result: Config = {};

    const contents = (
      await vscode.workspace.fs.readFile(vscode.Uri.file(uri))
    ).toString();
    var curSection = "OUTCAST";
    contents
      .split("\n")
      .map((ln) => {
        let res = keyValPair.exec(ln.trim());
        /* weird bug in .exec where even no lines
           always returns null, a bit hacky fix to
           execute it twice every time so we always land
           on odd */
        keyValPair.exec("skip");
        if (!res) {
          const sec = section.exec(ln.trim());
          section.exec("skip");
          if (sec && sec.groups) {
            curSection = sec.groups.title;
          }
        }
        return res;
      })
      .forEach((r) => {
        if (r && r.groups) {
          if (!result[curSection]) {
            result[curSection] = {};
          }
          result[curSection][r.groups.key] = r.groups.value;
        }
      });
    return result;
  }
}
