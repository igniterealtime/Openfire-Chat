TL_MessageBlast.Localisation = ( function( self ) {
  

	var language="english";

	function Init(lan){
		if(lan){
			language=lan;
		}
		console.info(lan,"hello from localisation. Language=",language);
	}

	function Term(texttolocalise){
		if(language=="english" || localisationdata[language][texttolocalise]==undefined){
			return texttolocalise;
		}else{
			return localisationdata[language][texttolocalise];
		}
	}

	function Languages(){
		return Object.keys(localisationdata);
	}
	  	

	var localisationdata =  {
										"English":{
												    "something":"something"
										},
										"Swedish":{
													"something":"något",
													 "Inbox" :"",
													 "New Blast" :"",
													 "Sent Blasts" :"",
													 "Settings" :"",
													 "Title Preset":"",
													 "Message Preset":"",
													 "Send as" :"",
		 									 		 "Reply to" :"",
		 									 		 "Title" :"",
		 									 		 "Message" :"",
		 									 		 "Preset" :"",
		 									 		 "Mark as Critical" :"",
		 									 		 "Send later" :"",
		 									 		 "Other recipients" :"",
		 									 		 "Upload CSV" :"",
		 									 		 "Send Blast" :"",
		 									 		 "Start send date" :"",
		 									 		 "Set halt date and time" :"",
		 									 		 "Start send date" :"",
		 									 		 "Recipients" :"",
		 									 		 "Error" :"",
		 									 		 "Please select a recipient" :"",
		 									 		 "Please add a title":"",
		 									 		 "Please add a message":"",
		 									 		 "Send Blast Message":"",
		 									 		 "Your Blast message will be sent to all the choosen recipients immediately. Are you sure you want to send?":"",
		 									 		 "Send":"",
		 									 		 "Cancel":""
										}
									}


	return {
			 init:Init,
			 term:Term,
		languages:Languages
	};
  
} ( TL_MessageBlast.Localisation || {} ));