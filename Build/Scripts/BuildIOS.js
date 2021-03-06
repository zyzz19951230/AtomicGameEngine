var fs = require('fs-extra');
var path = require("path");
var host = require("./Host");
var os = require('os');

var jenkinsBuild = process.env.ATOMIC_JENKINS_BUILD == 1;

var atomicRoot = host.atomicRoot;
var buildDir = host.artifactsRoot + "Build/IOS/";

namespace('build', function() {

    task('ios_native', {
        async: true
    }, function() {

        var options = host.options;
        var cleanBuild = options["noclean"] ? false : true;
        var debug = options["debug"] ? true : false;

        var NETNativeSrcDir = buildDir + "Source/AtomicNET/NETNative/" + (debug ? "Debug" : "Release") + "-iphoneos/";
        var NETNativeDestDir = host.artifactsRoot + "AtomicNET/" + (debug ? "Debug" : "Release") + "/Native/iOS/";

        host.setupDirs(cleanBuild, [buildDir, NETNativeDestDir]);

        process.chdir(buildDir);

        var cmds = [];

        cmds.push("cmake -DIOS=1 -DATOMIC_DEV_BUILD=0 -G Xcode ../../../");


        if (jenkinsBuild) {
            cmds.push("security -v list-keychains -d system -s /Users/jenkins/Library/Keychains/codesign.keychain");
            cmds.push("security -v unlock-keychain /Users/jenkins/Library/Keychains/codesign.keychain");
        }

        cmds.push("xcodebuild -configuration " + (debug ? "Debug" : "Release") + " -parallelizeTargets -jobs 4");
        // Note that this install_name_tool invocation invalidates the code signing, Xamarin/Visual Studio should resign the binary on deploy to device
        cmds.push("cd \"" + NETNativeSrcDir + "\" && install_name_tool -id @rpath/AtomicNETNative.framework/AtomicNETNative AtomicNETNative.framework/AtomicNETNative");
        //cmds.push("cd \"" + NETNativeSrcDir + "\" && codesign --deep --force --verify --sign \"iPhone Developer\" ./AtomicNETNative.framework/");
        cmds.push("cd \"" + NETNativeSrcDir + "\" && zip -r AtomicNETNative.framework.zip AtomicNETNative.framework");

        jake.exec(cmds, function() {

            fs.copySync(NETNativeSrcDir + "AtomicNETNative.framework", NETNativeDestDir + "AtomicNETNative.framework");
            fs.copySync(NETNativeSrcDir + "AtomicNETNative.framework.zip", NETNativeDestDir + "AtomicNETNative.framework.zip");

            complete();

        }, {
            printStdout: true,
            printStderr: true
        });

    });

}); // end of build namespace
