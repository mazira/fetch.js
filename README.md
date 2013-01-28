Introduction
=========

If you're like me and like to have local copies of your client side javascript files, you'd like fetchjs.

Fetchjs makes it trivial to download and setup the latest versions of client side libraries.

Usage
=========
To install fetchjs just do

    npm install -g fetchjs

This will make the `fetchjs` command available to you.  You can now initialize the fetchjs repo.

    fetchjs init
    
This may take a while depending on your internet connection, this command essentially clones the [cdnjs github repo](https://github.com/cdnjs/cdnjs).  At any time(or rather often) you may update the repo by issuing the update command:

    fetchjs update
    
Running fetchjs by itself will print details of supported commands.

    You need to specify the operation
    init    			Initialize repo (required)
    update				Update repo (do this once in a while)
    search <pattern>			Search for packages matching a certain name
    get <package>			Get the latest version of the package and dump it to console

You can search for availability of certain packages, `pattern` is just a regex.

To get contents of a package just do:

    fetchjs get jquery

This will dump the entire contents of the jquery.min.js file to your console, you can easily redirect this to a file in your project.

    fetchjs get jquery > public/js/jquery.js

And there you have it!

Stay tuned! More exciting stuff coming soon!
