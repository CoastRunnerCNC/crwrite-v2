export class MockGRBL {
    static processCommand(command) {
        console.log("✅ Processing command in MockGRBL:", command); // LOG COMMAND

        if (command === "?") {
            return `<Idle|MPos:0.000,0.000,0.000|FS:0,0>`;
        } else if (command.startsWith("G0")) {
            return "ok";
        } else if (command === "$$") {
            return "$0=10\n$1=25\n$100=250.000";
        } else {
            return "error: Invalid command";
        }
    }
}
