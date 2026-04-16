// Ready

$(document).ready(function(){

	//############## GET PROJECT
	BASE = $("link[rel='base']").attr("href");

	setUp();
	sectionAnimation();

	//############## MASK INPUT
	if ($('.formPhone').length) {
		$.getScript(BASE + '/js/maskinput.js', function () {

			var SPMaskBehavior = function (val) {
					return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
				},
				spOptions = {
					onKeyPress: function (val, e, field, options) {
						field.mask(SPMaskBehavior.apply({}, arguments), options);
					}
				};
			$('.formPhone').mask(SPMaskBehavior, spOptions);
		});
	}

	insertCookieDialog();

});

// Load More Button

$(document).on('click', 'button.loadMore', function(){

	var downloadTarget = $(this).data('download-target')+'.php';
	var loadTarget = $(this).data('load-target');
	var key = {key: 'chave-de-acesso'};

	$.ajax({

		type: 'POST',
		url: 'ajaxTarget/'+downloadTarget,
		data: key

	}).done(function(status){

		if(status !== 'ERRO'){

			$('#'+loadTarget).append(status);

		}else{

			console.error('Chave de Acesso Incorreta!');

		}

	});

});

// Post List Video Overlay

$(document).on('click', 'main#videos section.postList article', function(){

	var template = document.querySelector('#videoBoxTemplate');
	var dialog = template.content.querySelector('#videoBox');
	var src = $(this).data('video').replace('watch?v=', 'embed/');

	dialog = $($(dialog).clone());
	$(dialog).children('iframe').attr('src', src);

	$('body').before(dialog);

});

$(document).on('click', 'section#videoBox', function(e){

	if(e.target === this) $(this).remove();

});

// Input File Change

$(document).on('change', 'input[type="file"]', function(){

	var id = $(this).attr('id');
	$('label[for="'+id+'"] small').attr('data-file', $(this).val().split(/(\\|\/)/g).pop());

});

// Cookie Dialog

function insertCookieDialog(){

	//document.cookie = "cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
	var cookies = document.cookie.indexOf('cookies=true');

	if(cookies === -1){

		var template = document.querySelector('#cookieDialogTemplate');
		var dialog = template.content.querySelector('#cookieDialog');
		$('body').after(dialog);

	}

}

$(document).on('click', '#cookieDialog button', function(){

	var d = new Date();
	d.setTime(d.getTime() + (7*24*60*60*1000));

	var expires = "expires="+ d.toUTCString();
	document.cookie = "cookies=true;" + expires + ";path=/";

	$('#cookieDialog').addClass('removing');

	setTimeout(function(){

		$('#cookieDialog').remove();

	}, 500);

});

// Scroll Event

$(document).on('scroll', function(){

	sectionAnimation();
	bannerAnimation();
	showMenu();

	nossoNegocioImg();

});

// Bouncing Arrow

$(document).on('click', '.bouncingArrow.scrollDown', function(){

	$('body, html').animate({scrollTop: $(window).innerHeight()}, 500, 'swing');

});

// Section Animation

function nossoNegocioImg(){

	var section = ($('section#nossoNegocio').length > 0) ? $('section#nossoNegocio') : $('section#forYourBusiness');

	if(section.length > 0){

		var transform = Math.max(-100, Math.min(100, ($(window).scrollTop() - section.offset().top)/5));
		section.find('img').css({'transform': 'translateX('+transform+'px)'});

	}

}

function bannerAnimation(){

	$('section#banner')[($(window).scrollTop() > $(window).innerHeight()/3) ? 'addClass' : 'removeClass']('hideImg');

}

function setUp(){

	$.each($('section .delayable'), function(){

		var delay = 0;

		$.each($(this).children(), function(){

			$(this).css('transition-delay', delay+'s');
			delay += .25;

		});

	});

}

function sectionAnimation(){

	var scroll = $(document).scrollTop() + $(window).innerHeight()/2;

	$.each($('section:not(.animate)'), function(){

		var top = $(this).offset().top;
		if(scroll > top) $(this).addClass('animate');

	});

}

// Show Menu On Scroll Script

function showMenu(){

	var top = $(document).scrollTop();
	$('body')[(top > $(window).innerHeight()) ? 'addClass' : 'removeClass']('showMenu');

}

// Menu Trigger Script

$(document).on('click', '.trigger', function(){

	var target = $(this).data('target');

	$(target).toggleClass('opened');

	var classController = $(target).hasClass('opened') ? 'addClass' : 'removeClass';

	$(this)[classController]('opened');
	$('body')[classController]('scrollLock');

});
