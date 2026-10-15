/* Compila le sorgenti di src/ in app.js e mette insieme vendor.js.
   Uso: npm install && npm run build */
const fs = require("fs"), babel = require("@babel/core");
const B = __dirname, N = __dirname + "/node_modules";

const vendor = [
  N + "/react/umd/react.production.min.js",
  N + "/react-dom/umd/react-dom.production.min.js",
  N + "/xlsx/dist/xlsx.full.min.js",
].map(f => fs.readFileSync(f, "utf8")).join("\n;\n");
fs.writeFileSync(B + "/vendor.js", vendor);

const src = fs.readdirSync(B + "/src").filter(f => /\.jsx?$/.test(f)).sort();
const uniti = src.map(f => "/* ---- " + f + " ---- */\n" + fs.readFileSync(B + "/src/" + f, "utf8")).join("\n");
fs.writeFileSync(B + "/app.js", babel.transformSync(uniti, {
  presets: [[require.resolve("@babel/preset-react"), { runtime: "classic" }]],
  compact: false,
}).code);

const kb = p => (fs.statSync(p).size / 1024).toFixed(0) + "KB";
console.log("vendor.js " + kb(B + "/vendor.js") + "  app.js " + kb(B + "/app.js"));
