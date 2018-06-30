TL_MessageBlast.Fileuploader = ( function() {
  
   
    function Init(){
        console.log("Hello Fileuploader")  
    };

    function Uploadcsv(e){

        var reader = new FileReader();
        reader.onload = function(){
          var text = reader.result;
        
            var readfile = new CustomEvent('returnreadfile', { 'detail': reader.result});
            document.body.dispatchEvent(readfile);  
        
            console.log(reader.result.substring(0, 200));
        };
        reader.readAsText(e.target.files[0]);

    }
    
    
     
    return {
                    init:Init,
               uploadcsv:Uploadcsv
               
    };
  
} ( TL_MessageBlast.Fileuploader || {} ));