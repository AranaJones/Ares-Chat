import haxe.Json;
import StringTools;
import sys.io.File;

class Main {
  static function parseIntOrZero(raw:String):Int {
    var value = Std.parseInt(raw);
    return value == null ? 0 : value;
  }

  static function parseSNodesText(text:String):Array<Dynamic> {
    var nodes:Array<Dynamic> = [];
    var lines = text.split("\n");
    for (rawLine in lines) {
      var line = StringTools.trim(rawLine);
      if (line == "") continue;
      if (line.indexOf("<") != -1 || line.indexOf("#") != -1) continue;

      var parts = ~/[\t ]+/.split(line);
      if (parts.length < 2) continue;

      var host = parts[0];
      var port = Std.parseInt(parts[1]);
      if (port == null || port <= 0 || host == "127.0.0.1") continue;

      nodes.push({
        host: host,
        port: port,
        reports: parts.length > 2 ? parseIntOrZero(parts[2]) : 0,
        attempts: parts.length > 3 ? parseIntOrZero(parts[3]) : 0,
        connects: parts.length > 4 ? parseIntOrZero(parts[4]) : 0,
        firstSeen: parts.length > 5 ? parseIntOrZero(parts[5]) : 0,
        lastSeen: parts.length > 6 ? parseIntOrZero(parts[6]) : 0,
        lastAttempt: parts.length > 7 ? parseIntOrZero(parts[7]) : 0
      });
    }
    return nodes;
  }

  static function main() {
    var args = Sys.args();
    if (args.length < 1) {
      Sys.println("Usage: hl hashlink/bin/ares_hashlink.hl <path-to-SNodes.dat>");
      Sys.exit(1);
      return;
    }

    var text = File.getContent(args[0]);
    var nodes = parseSNodesText(text);
    Sys.println(Json.stringify({
      count: nodes.length,
      nodes: nodes
    }));
  }
}
