global.TextEncoderStream = class {
    constructor() {
        this.readable = new ReadableStream();
        this.writable = new WritableStream();
    }
};

global.TextDecoderStream = class {
    constructor() {
        this.readable = new ReadableStream();
        this.writable = new WritableStream();
    }
};
