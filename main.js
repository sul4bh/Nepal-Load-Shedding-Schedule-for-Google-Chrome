$(function(){
    checkForNewData();
    checkSetGroup();
})


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
    var effDate = $(dom).find('RESULTS').attr('effdate');
    var loc_update = $(dom).find('RESULTS').attr('LOC_UPDATE');

    chrome.storage.local.set({'update':loc_update}, function(){});

    $('#effective').html('Effective from: '+effDate);
    var locUpdate = $(dom).find('RESULTS').attr('LOC_UPDATE');
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
            var loc_update = $(dom).find('RESULTS').attr('LOC_UPDATE');

            var storage = chrome.storage.local;
            storage.get('update', function(data){
                var dataOf = moment(data.update, "YYYY/MM/DD");
                loc_update = moment(loc_update, "YYYY/MM/DD");
                if (loc_update.diff(dataOf) > 0){
                    storage.set({'data':scrubData(resp)}, function(){});
                    storage.set({'update':loc_update}, function(){});
                }


            })
        }

    )
}

function scrubData(resp){
    resp = resp.replace(/Wednesda/g,'Wednesday');
    return resp;
}