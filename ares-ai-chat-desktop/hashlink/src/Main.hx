class Main {
  static function main() {
    var args = Sys.args();
    var command = args.length > 0 ? args[0] : "ping";

    switch (command) {
      case "ping":
        Sys.println("hashlink:ok");
      default:
        Sys.println('unsupported command: $command');
        Sys.exit(1);
    }
  }
}
