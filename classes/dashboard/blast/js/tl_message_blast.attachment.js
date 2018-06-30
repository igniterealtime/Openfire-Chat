TL_MessageBlast.Attachment = ( function()
{
    function Init()
    {
        console.log("Hello Attachment")
    };

    function Upload(evt)
    {
        console.log("Attachment upload", evt)
        var files = evt.target.files;

        for (var i = 0, file; file = files[i]; i++)
        {
            TL_MessageBlast.Request.makerequest('GET', 'ask/upload/'+ config.username + '/' + file.name + '/' + file.size, function(json)
            {
                console.log("httpfileupload response", json);
            });
        }
    }

    return {
        init:Init,
        upload:Upload
    };

} ( TL_MessageBlast.Attachment || {} ));