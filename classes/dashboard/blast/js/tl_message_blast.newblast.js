TL_MessageBlast.Newblast = (function () {
  var data = {}
  var warningdialogComponent
  var dialogComponent
  var auser
  // var CheckBoxElements
  var recdatamodel = {}
  var helpurl="";

  function Init () {
    console.log('Hello TL_MessageBlast Request')
        // initial request to get senders for dropdown
    TL_MessageBlast.Request.makerequest('GET', 'messageblast/senders', TL_MessageBlast.Newblast.updatesendaslist)

    var resetnewblast = document.getElementById('resetnewblast')
    resetnewblast.addEventListener('click', function () {
      Resetfields()
    })

    var button = document.querySelector('.docs-sendblastdia-button')

    button.addEventListener('click', function () {
      TL_MessageBlast.Newblast.validatebeforesend()
    })

    document.getElementById('uploadcsv').addEventListener('click', function (e) {
      document.getElementById('attachement').value = ''
      document.getElementById('attachement').click()
    })

    document.getElementById('attachement').addEventListener('change', function (e) {
      TL_MessageBlast.Fileuploader.uploadcsv(e)
    })

    document.getElementById('attachupload').addEventListener('click', function (e) {
      document.getElementById('attachuploadfiles').value = ''
      document.getElementById('attachuploadfiles').click()
    })

    document.getElementById('attachuploadfiles').addEventListener('change', function (e) {
      TL_MessageBlast.Attachment.upload(e)
    })

    document.body.addEventListener('returnreadfile', function (ev) {
      console.log('returnreadfile ', ev.detail)
      document.getElementById('otherparticipants').value = ev.detail.replace(' ', '')
    })

    var example1 = document.querySelector('.docs-sendblastdia-lgHeader')
    var dialog = example1.querySelector('.ms-Dialog')
    dialogComponent = new fabric['Dialog'](dialog)

    var example = document.getElementsByClassName('docswarningDialogclose')[0]
    warningdialog = example.querySelector('.ms-Dialog')
    warningdialogComponent = new fabric['Dialog'](warningdialog)

    var enablesendlater = document.getElementById('enablesendlater')
    var sendlatercontainer = document.getElementById('sendlatercontainer')

    enablesendlater.addEventListener('click', function () {
      if (sendlatercontainer.className === 'hidden') {
        sendlatercontainer.className = ''
      } else {
        sendlatercontainer.className = 'hidden'
      }
    })

    var enablereoccuringsend = document.getElementById('enablereoccuringsend')
    var reoccuringcontainer = document.getElementById('reoccuringcontainer')

    enablereoccuringsend.addEventListener('click', function () {
      if (reoccuringcontainer.className.indexOf('hidden') !== -1) {
        reoccuringcontainer.className = 'padtop15'
      } else {
        reoccuringcontainer.className = 'hidden padtop15'
      }
    })

    var enablereoccuringhalt = document.getElementById('enablerepeatinghalttime')
    var reoccuringhaltcontainer = document.getElementById('reoccuringhaltcontainer')

    enablereoccuringhalt.addEventListener('click', function () {
      if (reoccuringhaltcontainer.className === 'hidden') {
        reoccuringhaltcontainer.className = ''
      } else {
        reoccuringhaltcontainer.className = 'hidden'
      }
    })

    var enablehalttime = document.getElementById('enablehalttime')
    var haltsettings = document.getElementById('haltsettings')

    enablehalttime.addEventListener('click', function () {
      if (haltsettings.className.indexOf('hidden') !== -1) {
        haltsettings.className = 'padtop15'
      } else {
        haltsettings.className = 'hidden padtop15'
      }
    })

    var searchrecipients = document.getElementById('searchrecipients')
    searchrecipients.addEventListener('change', function (e) {
            // if using live search change to "input" above
            // if(e.target.value.length>2){
      console.log('sentsearch', e.target.value)

      if(auser==undefined){

          Warningdialog ("Error", "Please select user to send as before searching for recipients")

      }else{
        participantpicker.innerHTML = '<div id="recipspin" class="ms-Spinner ms-Spinner--large"><div class="ms-Spinner-label">Loading... </div></div>'
        var spin = participantpicker.getElementsByClassName('ms-Spinner')[0]
        new fabric['Spinner'](spin)

        TL_MessageBlast.Request.makerequest('GET', 'messageblast/recievers/' + auser + '?query=' + e.target.value, TL_MessageBlast.Newblast.updaterecipientsmodel)
      }

            // }
    })

    var cancelbut = searchrecipients.parentNode.getElementsByClassName('ms-CommandButton-button')[0]

    cancelbut.addEventListener('click', function (e) {
      participantpicker.innerHTML = ''

      if (isEmpty(recdatamodel)) {
        var usertosendassel = document.getElementById('usertosendas').value

        if (usertosendassel.indexOf('Select') === -1) {
          if (usertosendassel != undefined || usertosendassel !== '') {
            TL_MessageBlast.Request.makerequest('GET', 'messageblast/recievers/' + usertosendassel, TL_MessageBlast.Newblast.updaterecipientsmodel)
          }
        }
      } else {
                // if no boxes checked in recipientsmodel .sear
        var anychecked = false

        for (u in recdatamodel['Search']) {
          if (recdatamodel['Search'].hasOwnProperty(u)) {
            if (recdatamodel['Search'][u].ischecked !== undefined) {
              console.log('test ', u, recdatamodel['Search'][u].ischecked)
              if (recdatamodel['Search'][u].ischecked === true) {
                anychecked = true
              }
            } else {
              delete recdatamodel['Search'][u]
            }
          }
        }

        if (anychecked === false) {
          delete recdatamodel['Search']
        }
        Renderrecipientchecklist()
      }
    })
  }

  function Updatesendaslist (responsejson) {
    console.log('Updatesendaslist', responsejson)
    helpurl=responsejson.help_url;

    var helpbutton = document.getElementById("helpbutton")
    helpbutton.addEventListener("click", function(i) {
      if(responsejson.help_url.length<2){
        window.open(window.location.href+"help/blast_help.pdf");
      }else{
        window.open(TL_MessageBlast.Newblast.gethelpurl());
      }

    });

    var participantpicker = document.getElementById('participantpicker')
    participantpicker.innerHTML = ''

    var sendaslistelem = document.getElementById('usertosendas')
    var replytolistelem = document.getElementById('replyto')

    if (responsejson.senders instanceof Array) {
      for (var u = 0; u < responsejson.senders.length; u++) {
        console.log('user', responsejson.senders[u])
        if (u === 0) {
          auser = responsejson.senders[u]
        }
        handleSender(responsejson.senders[u], sendaslistelem)
        handleSender(responsejson.senders[u], replytolistelem)
      };
    } else {
      auser = undefined
      for (var p in responsejson.senders) {
        if (responsejson.senders.hasOwnProperty(p)) {
          if (auser === undefined) {
            auser = p
          }
          handleSender(p, sendaslistelem, responsejson.senders[p])
          handleSender(p, replytolistelem, responsejson.senders[p])
        }
      }
    }

    var DropdownHTMLElements = document.querySelectorAll('.ms-Dropdown')
    for (var i = 0; i < DropdownHTMLElements.length; ++i) {
      var Dropdown = new fabric['Dropdown'](DropdownHTMLElements[i])
    }

    var usertosendas = document.getElementById('usertosendas')
    usertosendas.addEventListener('change', function (e) {
      document.getElementById('replyto').value = e.target.value
            // document.getElementById("replyto").value = e.target.nextElementSibling.innerHTML;

      var hiddenlis = document.getElementById('replyto').parentNode.getElementsByTagName('span')[0]
            // hiddenlis.innerHTML=e.target.value
      hiddenlis.innerHTML = e.target.nextElementSibling.innerHTML

      participantpicker.innerHTML = '<div id="recipspin" class="ms-Spinner ms-Spinner--large"><div class="ms-Spinner-label">Loading... </div></div>'
      var spin = participantpicker.getElementsByClassName('ms-Spinner')[0]
      new fabric['Spinner'](spin)
      TL_MessageBlast.Request.makerequest('GET', 'messageblast/recievers/' + this.value, TL_MessageBlast.Newblast.updaterecipientsmodel)
    })
  }

  function handleSender (sender, sendaslistelem, displayname) {
    var option = document.createElement('option')
    option.value = sender
    option.innerHTML = sender
    if (displayname !== undefined) {
      option.innerHTML = displayname
    }

    sendaslistelem.appendChild(option)
  }

  function Updaterecipientsmodel (responsejson) {
    if (!(responsejson.group instanceof Array)) {
      console.log('notarray', responsejson.group)
      var responsetoarray = [responsejson.group]
      responsejson.group = responsetoarray
    }

    for (var i = 0; i < responsejson.group.length; i++) {
      if (responsejson.group[i].name.indexOf('Search') !== -1) {
        responsejson.group[i].name = 'Search'
      }

      if (responsejson.group[i].user !== undefined) {
        if (!(responsejson.group[i].user instanceof Array)) {
          var usertoarray = [responsejson.group[i].user]
          responsejson.group[i].user = usertoarray
        }

        if (recdatamodel[responsejson.group[i].name] === undefined) {
          recdatamodel[responsejson.group[i].name] = {}
        }

        for (var u = 0; u < responsejson.group[i].user.length; u++) {
          if (recdatamodel[responsejson.group[i].name][responsejson.group[i].user[u].sipUri] === undefined) {
            recdatamodel[responsejson.group[i].name][responsejson.group[i].user[u].sipUri] = responsejson.group[i].user[u]
          }
        }
      } else {
        console.log('nothing found in search')
      }
    };

    Renderrecipientchecklist()
  }

  function Renderrecipientchecklist () {
    var dl = document.createElement('dl')

    for (var g in recdatamodel) {
      if (recdatamodel.hasOwnProperty(g)) {
                // console.log("recdatamodel group",g)

        var dt = document.createElement('dt')
        dt.className = 'checker'
        dt.innerHTML = '<div class="expander">+</div><input type="checkbox" id="option' + g + '" class="ms-CheckBox-input"><label for="option' + g + '" class="ms-CheckBox-field"><span class="ms-Label grouppicktitle noselect">' + g + '</span></label>'

                // make the search the top of the list
        if (g.indexOf('Search') !== -1) {
          dl.insertBefore(dt, dl.firstChild)
        } else {
          dl.appendChild(dt)
        }

        dt.checkboxobj = new fabric['CheckBox'](dt);

        (function (_g, _dt) {
          _dt.addEventListener('click', function (e) {
                       // console.log("test",_g,e.target)
            var groupfind = '[data-memberof=' + _g.replace(' ', '').replace('Search:', '') + ']'
            var subitems = document.querySelectorAll(groupfind)

                        // expanding
            if (e.target.className === 'expander') {
              if (e.target.innerHTML === '+') {
                e.target.innerHTML = '-'
                var hidey = ''
              } else {
                e.target.innerHTML = '+'
                var hidey = ' hidden'
              }
              for (var i = 0; i < subitems.length; i++) {
                subitems[i].parentNode.className = 'checker ms-CheckBox' + hidey
              };
            } else {
              var ischecked = _dt.checkboxobj.getValue()
              for (var i = 0; i < subitems.length; i++) {
                               // console.log("nnn ", _g, subitems[i].value)

                if (ischecked === true) {
                  subitems[i].parentNode.checkboxobj.check()
                  recdatamodel[_g][subitems[i].value].ischecked = true
                } else {
                  subitems[i].parentNode.checkboxobj.unCheck()
                  recdatamodel[_g][subitems[i].value].ischecked = false
                }
              };
            }

                        // console.log("recdatamodel",recdatamodel)
          })
        })(g, dt)

        for (var u in recdatamodel[g]) {
          if (recdatamodel[g].hasOwnProperty(u)) {
                    // console.log("recdatamodel user",u, recdatamodel[g][u]);
            var dd = document.createElement('dd')

            dd.innerHTML =
                        '       <input data-memberof="' + g.replace(' ', '').replace('Search:', '') + '" tabindex="-1" type="checkbox" class="subOption ms-CheckBox-input" value="' + recdatamodel[g][u].sipUri + '">' +
                        '       <label role="checkbox" class="ms-CheckBox-field" tabindex="0" aria-checked="false" name="checkboxa">' +
                        '           <span class="ms-Label noselect">' + recdatamodel[g][u].name + '</span>' +
                        '       </label>'

            dd.className = 'checker ms-CheckBox hidden'
            if (g.indexOf('Search') !== -1) {
              dd.className = 'checker ms-CheckBox'
              dl.insertBefore(dd, dl.childNodes[1])
            } else {
              dl.appendChild(dd)
            }

            dd.checkboxobj = new fabric['CheckBox'](dd)

            if (recdatamodel[g][u].ischecked === true) {
              dd.className = 'checker ms-CheckBox'
              dd.checkboxobj.check()
            }

            (function (_g, _u, _dd) {
              _dd.addEventListener('click', function (e) {
                if (_dd.checkboxobj.getValue() === true) {
                  recdatamodel[_g][_u].ischecked = true
                } else {
                  recdatamodel[_g][_u].ischecked = false
                }
                                // console.log("recdatamodel",recdatamodel)
              })
            })(g, u, dd)
          }
        }
      }
    }

    var participantpicker = document.getElementById('participantpicker')
    participantpicker.innerHTML = ''
    participantpicker.appendChild(dl)
  }

  function getcheckeditems () {
    var holdingarray = []

    for (var g in recdatamodel) {
      if (recdatamodel.hasOwnProperty(g)) {
        for (var u in recdatamodel[g]) {
          if (recdatamodel[g].hasOwnProperty(u)) {
            if (recdatamodel[g][u].ischecked === true) {
              holdingarray.push(recdatamodel[g][u].sipUri)
            }
          }
        }
      }
    }

    return holdingarray
  }

  function Validatebeforesend () {
    var otherecips = document.getElementById('otherparticipants').value
    otherecips = otherecips.toLowerCase()
    otherecips = otherecips.replace(/\s/g, '').replace(';', ',')
    var removesipregex = new RegExp('sip:', 'g')
    otherecips = otherecips.replace(removesipregex, '')

    var otherecipsarray = otherecips.split(',')

        // validate valid email
        // BAO disable for now TODO
    //var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    var validadditionalemails = []

    for (var i = 0; i < otherecipsarray.length; i++) {
      //if (otherecipsarray[i].match(mailformat)) {
        validadditionalemails.push(otherecipsarray[i])
      //}
    };

    if (otherecips.length > 1) {
      var recipientsarray = getcheckeditems().concat(validadditionalemails)
    } else {
      var recipientsarray = getcheckeditems()
    }

    if (recipientsarray.length > 0) {
      if (document.getElementById('title').value.length > 1) {
        if (document.getElementById('message').innerHTML.length > 1) {
                    // if(document.getElementById("replyto").value.length>1 && document.getElementById("replyto").value.indexOf("@")!=-1 ){

          var example = document.querySelector('.docs-sendblastdia-lgHeader')
          var button = example.querySelector('.docs-sendblastdia-button')
                        // var dialog = example.querySelector(".ms-Dialog");
          var label = example.querySelector('.docs-DialogExample-label')
                        // var dialogComponent = new fabric['Dialog'](dialog);

          dialogComponent.open()

          var messagerich = document.getElementById('message').innerHTML
          var messageplain = ''
          var messageplain = messagerich.replace(/<[^>]*>|&nbsp;/g, '')

          var sendstart = document.getElementById('sendstart').value
          var starthours = document.getElementById('starthours').value
          var startmins = document.getElementById('startmins').value
          var crontrigger = document.getElementById('cronvalue').value
          // var cronstopvalue = document.getElementById('cronstopvalue').value

          var repeatingsendstop = document.getElementById('repeatingsendstop').value
          var repeatingstophours = document.getElementById('repeatingstophours').value
          var repeatingstopmins = document.getElementById('repeatingstopmins').value


          var sendstop = document.getElementById('sendstop').value
          var stophours = document.getElementById('stophours').value
          var stopmins = document.getElementById('stopmins').value

          if (document.getElementById('enablesendlater').checked !== true) {
            var sendstartandtime = ''
          } else {
            if (sendstart === '') {
              sendstart = '2017'
            }
            var formattedsendstart = Date.parse(sendstart + ' ' + starthours + ':' + startmins + ':00 GMT')
            var newdate = new Date(formattedsendstart)
            var sendstartandtime = newdate.toISOString()
            console.log('formattedsendstart ', sendstartandtime)
          }

          if (document.getElementById('enablerepeatinghalttime').checked !== true) {
            var repeatingsendstopandtime = ''
          } else {
            if (repeatingsendstop === '') {
              repeatingsendstop = '2017'
            }
            var formattedrepeatingsendstopandtime = Date.parse(repeatingsendstop + ' ' + repeatingstophours + ':' + repeatingstopmins + ':00 GMT')
            var newdate = new Date(formattedrepeatingsendstopandtime)
            var repeatingsendstopandtime = newdate.toISOString()
            console.log('formattedrepeatingsendstopandtime ', repeatingsendstopandtime)
          }


          if (document.getElementById('enablereoccuringsend').checked !== true) {
            crontrigger = ''
          }

          if (document.getElementById('enablehalttime').checked !== true) {
            var sendstopandtime = ''
          } else {
            if (sendstop == '') {
              sendstop = '2017'
            }
            var formattedsendstop = Date.parse(sendstop + ' ' + stophours + ':' + stopmins + ':00 GMT')
            var newdate = new Date(formattedsendstop)
            sendstopandtime = newdate.toISOString()
            console.log('formattedsendstart ', sendstopandtime)
          }

          // if (document.getElementById('enablerepeatinghalttime').checked !== true) {
          //   repeatingstopvalue = ''
          // }

          var sendlatertoggle = false
          if (document.getElementById('enablesendlater').checked || document.getElementById('enablereoccuringsend').checked || document.getElementById('enablehalttime').checked) {
            sendlatertoggle = true
          }

          data = {
            'title': document.getElementById('title').value,
            'messagehtml': messagerich,
            'message': messageplain,
            'highImportance': document.getElementById('markascritical').checked,
                                        // "ackRequired": document.getElementById("askforacknowlegement").checked,
            'sender': document.getElementById('usertosendas').value,
            'recipients': recipientsarray,
            'replyTo': document.getElementById('replyto').value,
            'sendlater': sendlatertoggle,
            'dateToSend': sendstartandtime,
            'crontrigger': crontrigger,
            'cronstop': repeatingsendstopandtime,
            'dateToStop': sendstopandtime
          }
        } else {
          console.log('Please add a message')
          TL_MessageBlast.Newblast.warningdialog('Error', 'Please add a message')
        }
      } else {
        console.log('Please add a title')
        TL_MessageBlast.Newblast.warningdialog('Error', 'Please add a title')
      }
    } else {
      console.log('Please select a participant')
      TL_MessageBlast.Newblast.warningdialog('Error', 'Please select a recipient')
    }
  }

  function Sendblast () {
    console.log('Send as ', data)
    TL_MessageBlast.Request.makerequest('POST', 'messageblast/sendblast', TL_MessageBlast.Newblast.sendcompleted, JSON.stringify(data))
  }

  function Sendcompleted (responsejson) {
    console.log('Send completed')
    var label = document.querySelector('.docs-sendblastdia-label')
    label.innerText = 'Blast sent'
    TL_MessageBlast.Newblast.warningdialog('Sent', 'The blast has been sent')
  }

  function Warningdialog (titletext, contenttext) {
    var example = document.getElementsByClassName('docswarningDialogclose')[0]
    var titletextdom = example.querySelector('.ms-Dialog-title')
    titletextdom.innerHTML = titletext
    var content = example.querySelector('.ms-Dialog-content')
    content.innerHTML = contenttext
    warningdialogComponent.open()
  }

  function Resetfields () {
    location.reload()
  }

  function isEmpty (obj) {
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) { return false }
    }

    return JSON.stringify(obj) === JSON.stringify({})
  }

  function Gethelpurl(){
    return helpurl;
  }

  return {
    init: Init,
    updaterecipientsmodel: Updaterecipientsmodel,
    renderrecipientchecklist: Renderrecipientchecklist,
    updatesendaslist: Updatesendaslist,
    sendcompleted: Sendcompleted,
    validatebeforesend: Validatebeforesend,
    sendblast: Sendblast,
    warningdialog: Warningdialog,
    resetfields: Resetfields,
    gethelpurl:Gethelpurl
  }
}(TL_MessageBlast.Newblast || {}))