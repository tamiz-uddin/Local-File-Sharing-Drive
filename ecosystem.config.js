module.exports = {
    apps: [{
        name: "file-sharing",
        script: "./server.js",
        env: {
            PORT: 80,
            NODE_ENV: "production"
        }
    }]
}
