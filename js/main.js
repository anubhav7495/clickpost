jQuery(document).ready(function($){
  var URL = "https://www.clickpost.in/api/v2/track-order/";
  var eventsMinDistance = 120;
  var params = {
    username: "testuser",
    key: "2e9b19ac-8e1f-41ac-a35b-4cd23f41ae17"
  };

  params.waybill = parseInt(urlParam('waybill')) || 3515341;
  params.cp_id = parseInt(urlParam('cp_id')) || 10;

  $.getJSON(URL, params, function(data) {
    var result = data.result[params.waybill.toString()];
    var events = [];
    var eventsContents = [];
    var timelines = $('.horizontal-timeline');

    sortScansByTime(result);

    for(var i=0; i<result.scans.length; i++) {
      events.push('<li><a data-pos="'+ i +'">'+ result.scans[i].clickpost_status_description +'</a></li>');
      eventsContents.push(
        '<li data-pos="'+ i +'">' +
        '<h2>'+ result.scans[i].clickpost_status_description +'</h2>' +
        '<em>'+ formatTimestamp(result.scans[i].timestamp) +'</em>' +
        '<p><span class="text-bold">Status:</span>&nbsp;'+ result.scans[i].remark +'<br>'+
        '<span class="text-bold">Current Location:</span>&nbsp;'+ result.scans[i].location +'</p>' +
        '</li>'
      );
    }
    $(".events ol").append(events);
    $(".events-content ol").append(eventsContents);
    $(".events ol li a").last().addClass("selected");
    $(".events-content ol li").last().addClass("selected");
    (timelines.length > 0) && initTimeline(timelines);
  });

  function initTimeline(timelines) {
    timelines.each(function() {
      var timeline = $(this),
          timelineComponents = {};

      timelineComponents['timelineWrapper'] = timeline.find('.events-wrapper');
      timelineComponents['eventsWrapper'] = timelineComponents['timelineWrapper'].children('.events');
			timelineComponents['fillingLine'] = timelineComponents['eventsWrapper'].children('.filling-line');
			timelineComponents['timelineEvents'] = timelineComponents['eventsWrapper'].find('a');
			timelineComponents['timelineNavigation'] = timeline.find('.timeline-navigation');
      timelineComponents['eventsContent'] = timeline.children('.events-content');

      var totalWidth = setEventsPosition(timelineComponents);
      timelineComponents['eventsWrapper'].css('width', totalWidth+'px');
      updateFilling(timelineComponents['eventsWrapper'].find('a.selected'), timelineComponents['fillingLine'], totalWidth);
      updateTimelinePosition('next', timelineComponents['eventsWrapper'].find('a.selected'), timelineComponents);
      $(".loader").hide();
      timeline.addClass('loaded');

			timelineComponents['timelineNavigation'].on('click', '.next', function(event){
				event.preventDefault();
				updateSlide(timelineComponents, totalWidth, 'next');
			});

			timelineComponents['timelineNavigation'].on('click', '.prev', function(event){
				event.preventDefault();
				updateSlide(timelineComponents, totalWidth, 'prev');
			});

			timelineComponents['eventsWrapper'].on('click', 'a', function(event){
				event.preventDefault();
				timelineComponents['timelineEvents'].removeClass('selected');
				$(this).addClass('selected');
				updateOlderEvents($(this));
				updateFilling($(this), timelineComponents['fillingLine'], totalWidth);
				updateVisibleContent($(this), timelineComponents['eventsContent']);
			});

      $(document).keyup(function(event){
        if(event.which=='37' && elementInViewport(timeline.get(0)) ) {
          showNewContent(timelineComponents, totalWidth, 'prev');
        } else if( event.which=='39' && elementInViewport(timeline.get(0))) {
          showNewContent(timelineComponents, totalWidth, 'next');
        }
      });
    });
  }

  function updateSlide(timelineComponents, totalWidth, string) {
		//retrieve translateX value of timelineComponents['eventsWrapper']
		var translateValue = getTranslateValue(timelineComponents['eventsWrapper']),
			wrapperWidth = Number(timelineComponents['timelineWrapper'].css('width').replace('px', ''));
		//translate the timeline to the left('next')/right('prev')
		(string == 'next')
			? translateTimeline(timelineComponents, translateValue - wrapperWidth + eventsMinDistance, wrapperWidth - totalWidth)
			: translateTimeline(timelineComponents, translateValue + wrapperWidth - eventsMinDistance);
	}

	function showNewContent(timelineComponents, totalWidth, string) {
		//go from one event to the next/previous one
		var visibleContent =  timelineComponents['eventsContent'].find('.selected'),
			newContent = ( string == 'next' ) ? visibleContent.next() : visibleContent.prev();

		if ( newContent.length > 0 ) { //if there's a next/prev event - show it
			var selectedDate = timelineComponents['eventsWrapper'].find('.selected'),
				newEvent = ( string == 'next' ) ? selectedDate.parent('li').next('li').children('a') : selectedDate.parent('li').prev('li').children('a');

			updateFilling(newEvent, timelineComponents['fillingLine'], totalWidth);
			updateVisibleContent(newEvent, timelineComponents['eventsContent']);
			newEvent.addClass('selected');
			selectedDate.removeClass('selected');
			updateOlderEvents(newEvent);
			updateTimelinePosition(string, newEvent, timelineComponents);
		}
	}

  function setEventsPosition(timelineComponents) {
    var length = timelineComponents['timelineEvents'].length;
    eventsMinDistance = ($(".events-wrapper").width()/length) > eventsMinDistance ? $(".events-wrapper").width()/length : eventsMinDistance;

    for(var i=0; i<length; i++) {
      timelineComponents['timelineEvents'].eq(i).css('left', i*eventsMinDistance+'px');
    }
    return eventsMinDistance*length;
  }

  function updateFilling(selectedEvent, filling, totWidth) {
    var eventStyle = window.getComputedStyle(selectedEvent.get(0), null),
			eventLeft = eventStyle.getPropertyValue("left"),
			eventWidth = eventStyle.getPropertyValue("width");
		eventLeft = Number(eventLeft.replace('px', '')) + Number(eventWidth.replace('px', ''))/2;
		var scaleValue = eventLeft/totWidth;
		setTransformValue(filling.get(0), 'scaleX', scaleValue);
  }

  function updateTimelinePosition(string, event, timelineComponents) {
		var eventStyle = window.getComputedStyle(event.get(0), null),
			eventLeft = Number(eventStyle.getPropertyValue("left").replace('px', '')),
			timelineWidth = Number(timelineComponents['timelineWrapper'].css('width').replace('px', '')),
			totalWidth = Number(timelineComponents['eventsWrapper'].css('width').replace('px', ''));
		var timelineTranslate = getTranslateValue(timelineComponents['eventsWrapper']);

        if( (string == 'next' && eventLeft > timelineWidth - timelineTranslate) || (string == 'prev' && eventLeft < - timelineTranslate) ) {
        	translateTimeline(timelineComponents, - eventLeft + timelineWidth/2, timelineWidth - totalWidth);
        }
	}

  function translateTimeline(timelineComponents, value, totWidth) {
		var eventsWrapper = timelineComponents['eventsWrapper'].get(0);
		value = (value > 0) ? 0 : value; //only negative translate value
		value = ( !(typeof totWidth === 'undefined') &&  value < totWidth ) ? totWidth : value; //do not translate more than timeline width
		setTransformValue(eventsWrapper, 'translateX', value+'px');
		//update navigation arrows visibility
		(value == 0 ) ? timelineComponents['timelineNavigation'].find('.prev').addClass('inactive') : timelineComponents['timelineNavigation'].find('.prev').removeClass('inactive');
		(value == totWidth ) ? timelineComponents['timelineNavigation'].find('.next').addClass('inactive') : timelineComponents['timelineNavigation'].find('.next').removeClass('inactive');
	}

  function getTranslateValue(timeline) {
		var timelineStyle = window.getComputedStyle(timeline.get(0), null),
			timelineTranslate = timelineStyle.getPropertyValue("-webkit-transform") ||
         		timelineStyle.getPropertyValue("-moz-transform") ||
         		timelineStyle.getPropertyValue("-ms-transform") ||
         		timelineStyle.getPropertyValue("-o-transform") ||
         		timelineStyle.getPropertyValue("transform");

        if( timelineTranslate.indexOf('(') >=0 ) {
        	var timelineTranslate = timelineTranslate.split('(')[1];
    		timelineTranslate = timelineTranslate.split(')')[0];
    		timelineTranslate = timelineTranslate.split(',');
    		var translateValue = timelineTranslate[4];
        } else {
        	var translateValue = 0;
        }

        return Number(translateValue);
	}

  function updateVisibleContent(event, eventsContent) {
		var eventPos = event.data('pos'),
			visibleContent = eventsContent.find('.selected'),
			selectedContent = eventsContent.find('[data-pos="'+ eventPos +'"]'),
			selectedContentHeight = selectedContent.height();

		if (selectedContent.index() > visibleContent.index()) {
			var classEntering = 'selected enter-right',
				classLeaving = 'leave-left';
		} else {
			var classEntering = 'selected enter-left',
				classLeaving = 'leave-right';
		}

		selectedContent.attr('class', classEntering);
		visibleContent.attr('class', classLeaving).one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(){
			visibleContent.removeClass('leave-right leave-left');
			selectedContent.removeClass('enter-left enter-right');
		});
		eventsContent.css('height', selectedContentHeight+'px');
	}

  function setTransformValue(element, property, value) {
		element.style["-webkit-transform"] = property+"("+value+")";
		element.style["-moz-transform"] = property+"("+value+")";
		element.style["-ms-transform"] = property+"("+value+")";
		element.style["-o-transform"] = property+"("+value+")";
		element.style["transform"] = property+"("+value+")";
	}

  function updateOlderEvents(event) {
		event.parent('li').prevAll('li').children('a').addClass('older-event').end().end().nextAll('li').children('a').removeClass('older-event');
	}

  function elementInViewport(el) {
		var top = el.offsetTop;
		var left = el.offsetLeft;
		var width = el.offsetWidth;
		var height = el.offsetHeight;

		while(el.offsetParent) {
		    el = el.offsetParent;
		    top += el.offsetTop;
		    left += el.offsetLeft;
		}

		return (
		    top < (window.pageYOffset + window.innerHeight) &&
		    left < (window.pageXOffset + window.innerWidth) &&
		    (top + height) > window.pageYOffset &&
		    (left + width) > window.pageXOffset
		);
	}

  function sortScansByTime(object) {
    object.scans.sort(function(a, b) {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
  }

  function formatTimestamp(timestamp) {
    var date = new Date(timestamp);
    return date.toString();
  }

  function urlParam(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
       return null;
    }
    else{
       return results[1] || 0;
    }
  }
});
