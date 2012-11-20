$(function () {
    checkGetLocation(searchLocation);
    checkForNewData();
    checkSetGroup();
});


function checkSetGroup(){
    var storage = chrome.storage.sync;
    storage.get('group', function(data){
        var group = (data.group)?(data.group):1;
        storage.set({'group': group}, function(){
            checkGetData();
        });
    })
}

function checkGetData(){
    var storage = chrome.storage.local;
    storage.get('data', function(data){
        var data = (data.data)?renderSchedule(data.data):fetchData(renderScheduleInit);
    })

}

function fetchData(callback){
    var storage = chrome.storage.local;
    $.get(
        'http://dl.dropbox.com/u/60336235/NLS/NLS.html',
        function(resp){
            resp = scrubData(resp);
            storage.set({'data': resp}, function(){
                callback();
            });
        }

    )

}


function getSchedule(group){
    var storage = chrome.storage.local;
    $.get(
        'http://dl.dropbox.com/u/60336235/NLS/NLS.html',
        function(resp){
            storage.set({'data': resp}, function(){
                renderScheduleInit();
            });
        }

    )

}


function renderScheduleInit(){
    var storage = chrome.storage.local;
    storage.get('data', function(data){
        renderSchedule(data.data);
    })
}

function renderSchedule(data){
    var dom = $.parseXML(data);
    var effdateRaw = $(dom).find('RESULTS').attr('effdate');
    effdateRaw = effdateRaw.split('/');
    var effdate = new Nepdate();
    effdate = effdate.bs2ad(effdateRaw);
    effdate = effdate.join('/');


    chrome.storage.local.set({'update':effdate}, function(){});

    $('#effective').html('Effective from: '+effdate);
    var nls = $(dom).find('NLS');

    var data = {},
        dataJson = [],
        dataJsonFinal = {};

    nls.each(function(){
        var groupData = {};
        var params = ['Group','Day'];
        for (var i = 0;i<params.length;i++){
            groupData[params[i]] = $(this).find(params[i]).text();
        }

        //Time should be formatted before pushing
        groupData['Time'] = formatTime($(this).find('Time').text());
        var today = moment().format('dddd');
        if (today == groupData['Day']){
            groupData['Status'] = 'active';
        }

        (data[groupData['Group']])?'':data[groupData['Group']] = [];
        data[groupData['Group']].push(groupData);
    })

    for (var i = 1;i < 8;i++){
        var json = {Group:i,Info:data[i]};
        dataJson.push(json);
    }

    dataJsonFinal.data = dataJson;

    var html = Mustache.to_html($('#template').html(), dataJsonFinal);

    $('#loading').hide();

    $('.sch').html(html);
    $('.group').click(function(){
        groupClick(this);
    });

    chrome.storage.sync.get('group',function(data){
        var group = data.group;
        $('#grp'+group).trigger('click');
    })



}




//UI functions
function groupClick(group){
    $('.active-group').removeClass('active-group');
    var grp = $(group).addClass('active-group').attr('data');

    chrome.storage.sync.set({group:grp},function(){});

    var info = $('.data-'+grp);
    $('.info,.active').removeClass('active').addClass('hidden');
    info.addClass('active').removeClass('hidden');
}


function formatTime(time){
    var timeData = [];
    var times = time.split(',');
    for (var i =0 ; i < times.length ; i++){
        var range = times[i].split('-');
        var newRange = [];
        for (var item in range){
            var timeArray = range[item].split(':');
            var formattedTime = moment().startOf('day').add({hours:timeArray[0],minutes:timeArray[1]}).format('hh:mm a');
            newRange.push(formattedTime);
        }

        var rangeDict = {Section:i,Start:newRange[0],End:newRange[1]};
        timeData.push(rangeDict);
    }

    return timeData;
}

function checkForNewData(){
    var storage = chrome.storage.local;
    $.get(
        'http://dl.dropbox.com/u/60336235/NLS/NLS.html',
        function(resp){
            var dom = $.parseXML(resp);
            var effdateRaw = $(dom).find('RESULTS').attr('effdate');
            effdateRaw = effdateRaw.split('/');
            var effdate = new Nepdate();
            effdate = effdate.bs2ad(effdateRaw);
            effdate = effdate.join('/');

            var storage = chrome.storage.local;
            storage.get('update', function(data){
                var dataOf = moment(data.update, "YYYY/MM/DD");
                effdate = moment(effdate, "YYYY/MM/DD");
                if (effdate.diff(dataOf) > 0){
                    var scrub = scrubData(resp);
                    chrome.storage.local.set({'data':scrub});
                    chrome.storage.local.set({'update':effdate});
                }
            });
        }

    );
}

function scrubData(resp){
    resp = resp.replace(/Wednesda/g,'Wednesday');
    return resp;
}


/* Location Search Related */
function searchLocation(data){
    //generate data

    var dom = $.parseXML(data);
    var locData = [];

    var locations = $(dom).find('LOCATION');
    for(var i=0;i<locations.length;i++){
        var locunitData = {};
        locunitData['location'] = $(locations[i]).attr('NAME');
        locunitData['group'] = $(locations[i]).attr('GROUP');
        locunitData['substation'] = $(locations[i]).attr('SUBSTATION');
        locData.push(locunitData);
    }

    locaData = locData.sort(function(el1,el2) { return el1.location == el2.location ? 0 : (el1.location < el2.location ? -1 : 1); } );


    for(var i=0;i<locData.length;i++){
        $('#location').append('<option value='+locData[i].group+'>'+locData[i].location+' || Sub-station:  '+locData[i].substation+'</option>')
    }

    $('#searchBar').show();
    $('#location').bind('change',function(){
        var group = $(this).val();
        $('#grp'+group).trigger('click');
    })

}


function checkGetLocation(callback){
    var storage = chrome.storage.local;
    storage.get('LOCdata', function(data){
        (data.LOCdata)?callback(data.LOCdata):fetchLOCData(callback);
    })
}


function fetchLOCData(callback){
    $.get(
        'http://dl.dropbox.com./u/60336235/NLS/NLS_Locations.html',
        function(response){
            chrome.storage.local.set({'LOCdata':response});
            callback(response);
        }
    )
}
