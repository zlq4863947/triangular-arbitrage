const glob = require("glob");
const path = require( 'path' );

var args = process.argv.splice(2);
let name = 'start';
if(args.length != 0) {
    name = args[0];
}

glob.sync(`dist/**/${name}.js`).forEach( function( file ) {
    require(path.resolve(file));
});