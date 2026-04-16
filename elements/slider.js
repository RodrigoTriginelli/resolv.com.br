class WMSlider extends HTMLElement{
	
	constructor(){
		
		super();
		
		this.slideLoop;
		this.slide = 0;		
		this.internals = ((this.attachInternals) !== undefined ? this.attachInternals() : {states: new States()});
		
	}
	
	connectedCallback(){
		
		var that = this;
		
		if(this.rowCount !== parseFloat(window.getComputedStyle(this).getPropertyValue('--row-count'))) this.style.setProperty('--row-count', this.rowCount);
		
		if(this.infinite){
		
			$(document).ready(function(){
				
				var rows = $(that).children('wm-slider-mat wm-slider-row:not(:--clone)');
				
				placeClones(rows, 'append');
				placeClones(rows.toArray().reverse(), 'prepend');
				
				that.slide = rows.length;
				$(that).children('wm-slider-mat').css({'transform': 'translateX(-'+(that.slide * 100/that.rowCount)+'%)', 'transition-duration': '0s'});
				
				$.each($(that).find('wm-slider-row'), function(){
				
					this.active = false;

				});			
				$(that).find('wm-slider-row:nth-child('+(that.slide + 1)+')')[0].active = true;
				
				setTimeout(function(){
					
					var style = $(that).children('wm-slider-mat').attr('style');
					$(that).children('wm-slider-mat').attr('style', style.replace('transition-duration: 0s;', ''));
					
				}, 10);
				
				function placeClones(array, place){
					
					$.each(array, function(){

						var clone = $(this).clone()[0];
						clone.clone = true;
						clone.active = false;

						$(that).children('wm-slider-mat')[place](clone);

					});
					
				}
				
			});
			
		}
		
		that.slideLoop();
		
		if(this.grabbable){
			
			$(this).on('mousedown touchstart', 'wm-slider-mat', function(s){
				
				var x = that.slide * 100/that.rowCount;
				var clicked = true;
				var moving = false;

				var sx = (s.type === 'touchstart') ? s.originalEvent.changedTouches : s.pageX;	
				if(s.type === 'touchstart') sx = sx[sx.length - 1].pageX;

				$('html')[0].setAttributeNode(document.createAttribute('unselectable'));
				that.grabbing(true);
				
				window.clearTimeout(that.slideLoopTimeout);

				$(document).on('mousemove touchmove', function(e){

					if(clicked){
						
						moving = true;

						var ex = (e.type === 'touchmove') ? e.originalEvent.changedTouches : e.pageX;	
						if(e.type === 'touchmove') ex = ex[ex.length - 1].pageX;

						x = Math.max(-($(that).find('wm-slider-row').length - 1)*100, Math.min(0, ((ex - sx)/$(that).innerWidth() - that.slide/that.rowCount) * 100));

						$(that).children('wm-slider-mat').css({'transform': 'translateX('+x+'%)', '-webkit-transform': 'translateX('+x+'%)'});

					}

				});

				$(document).one('mouseup touchend', function(){
					
					if(moving){

						moving = false;						
						that.slideTo(Math.round(Math.abs(x*that.rowCount/100)));

					}else if(s.target.tagName === 'A' || $(s.target).parents('a').length >= 1){ 	
						
						s.target.click();
						
					}

					$('html').removeAttr('unselectable');
					that.grabbing(false);

					clicked = false;

				});
				
			});
			
		}
		
	}
	
	slideTo(dir){
		
		if(!this.lockSlide){
		
			var that = this;
			var prevSlide = this.slide;
			var length = $(this).find('wm-slider-row').length;

			window.clearTimeout(this.slideLoopTimeout);

			switch(dir){

				case 'left':
					this.slide--;
				break;
				case 'right':
					this.slide++;
				break;
				default:
					this.slide = parseInt(dir);
				break;

			}

			this.slide = Math.max(0, Math.min(this.slide, $(this).find('wm-slider-row').length - 1));		
			$(this).children('wm-slider-mat').css({'transform': 'translateX(-'+(this.slide * 100/this.rowCount)+'%)', '-webkit-transform': 'translateX(-'+(this.slide * 100/this.rowCount)+'%)'});

			if(this.infinite){

				var duration = parseFloat(window.getComputedStyle($(this).children('wm-slider-mat')[0]).transitionDuration) * 1000;
				this.lockSlide = true;

				if(this.slide >= length*2/3 || this.slide === 0){
					
					setTimeout(function(){
						
						that.internals.states.add('--reseting');

						that.slide = Math.abs(that.slide - length/3);
						$(that).children('wm-slider-mat').css({'transition-duration': '0s', 'transform': 'translateX(-'+(that.slide * 100/that.rowCount)+'%)', '-webkit-transform': 'translateX(-'+(that.slide * 100/that.rowCount)+'%)'});

						setTimeout(function(){

							var style = $(that).children('wm-slider-mat').attr('style');
							$(that).children('wm-slider-mat').attr('style', style.replace('transition-duration: 0s;', ''));
			
							$.each($(that).find('wm-slider-row'), function(){

								this.active = false;

							});			
							$(that).find('wm-slider-row:nth-child('+(that.slide + 1)+')')[0].active = true;

							setTimeout(function(){
							
								that.internals.states.delete('--reseting');
								
							}, 50);
							
						}, 10);

					}, duration);

				}

				setTimeout(function(){
					
					that.lockSlide = false;
					
				}, duration + 10);
				
			}
			
			$.each($(this).find('wm-slider-row'), function(){
				
				this.active = false;
				
			});			
			$(this).find('wm-slider-row:nth-child('+(this.slide + 1)+')')[0].active = true;

			$.each($(this).find('wm-slider-trigger'), function(){

				this.active(false);

			});
			
			var triggerSlideTo = $(this).find('wm-slider-trigger[slide-to="'+this.slide+'"]')[0];
			if(triggerSlideTo !== undefined) triggerSlideTo.active(true);
			
			this.slideLoop();
			
		}
		
		return (prevSlide !== this.slide);
		
	}
	
	slideLoop(){
		
		var that = this;
		var slides = 0;
		
		if(this.autoSlide !== undefined && parseInt(this.autoSlide) > 0){
			
			this.slideLoopTimeout = setTimeout(function(){

				if(!that.slideTo('right')) that.slideTo(0);
				
			}, this.autoSlide);

		}

	}
	
	grabbing(grabbing) {
		
		var action = (grabbing) ? 'add' : 'delete';
		this.internals.states[action]('--grabbing');
		
		if((typeof(this.attachInternals) === undefined)){
			
			console.log(this.internals.states.has('--grabbing'));
			
			if(this.internals.states.has('--grabbing')){
				
				this.setAttributeNode(document.createAttribute('grabbing'));
				
			}else{
				
				this.removeAttributeNode(document.createAttribute('grabbing'));
				
			}
			
		}

	}
	
	get grabbable(){return ($(this).attr('grabbable') !== undefined && ($(this).attr('grabbable') === '' || $(this).attr('grabbable') === 'true'));}
	get rowCount(){
		
		var count = parseFloat(window.getComputedStyle(this).getPropertyValue('--row-count'));
		return Math.max(1, count);
	
	}
	get infinite(){return ($(this).attr('infinite') !== undefined && ($(this).attr('infinite') === '' || $(this).attr('infinite') === 'true'));}
	get autoSlide(){return $(this).attr('auto-slide');}
	
}

class WMSliderControls extends HTMLElement{
	
	constructor(){
		
		super();
		
	}
	
	connectedCallback(){
		
		var that = this;
		
		//this.target = ($(this).attr('for') !== undefined) ? $($(this).attr('for'))[0] : $(this).parents('wm-slider')[0];
		
		$(this).on('click', 'wm-slider-trigger', function(){
			
			var slideTo = $(this).attr('slide-to');
			
			$.each($(this).siblings(), function(){
				
				this.active(false);
				
			});
			
			this.active(true);
			
			that.target.slideTo(slideTo);
			
		});
		
	}
	
	get target(){return ($(this).attr('for') !== undefined) ? $($(this).attr('for'))[0] : $(this).parents('wm-slider')[0];}
	
}

class WMSliderTrigger extends HTMLElement{
	
	constructor(){
		
		super();
		this.internals = ((this.attachInternals) !== undefined ? this.attachInternals() : {states: new States()});
		
	}
	
	connectedCallback(){
		
		this.setAttribute('tabindex', 0);		
		if($(this).index() === 0) this.active(true);
		
	}
	
	active(active){
		
		var action = (active) ? 'add' : 'delete';
		this.internals.states[action]('--active');
		
	}
	
}

class WMSliderRow extends HTMLElement{
	
	constructor(){
		
		super();
		this.internals = ((this.attachInternals) !== undefined ? this.attachInternals() : {states: new States()});
		
	}
	
	connectedCallback(){
		
		var i = $(this).parents('wm-slider')[0].slide;
		this.active = ($(this).index() === i);
		
	}
	
	set active(isActive){this.internals.states[isActive ? 'add' : 'delete']('--active');}	
	get active(){this.internals.states.has('--active');}
	
	set clone(add){this.internals.states[add ? 'add' : 'delete']('--clone');}
	get clone(){return this.internals.states.has('--clone');}
	
}

class States{
	
	constructor(){
		
		this.list = [];
		
	}
	
	add(state){
		
		this.list.push(state);
		
	}
	
	has(state){
		
		var has = false;
		
		$.each(this.list, function(){
			
			has = (this === state);
			return !has;
			
		});
		
		return has;
		
	}
	
	delete(state){
		
		var that = this;
		
		$.each(this.list, function(index){
			
			if(that === state){
				
				that.list = that.list.splice(index, 1);
				return false;
				
			}
			
		});
		
	}
	
}

window.customElements.define('wm-slider', WMSlider);
window.customElements.define('wm-slider-controls', WMSliderControls);
window.customElements.define('wm-slider-trigger', WMSliderTrigger);
window.customElements.define('wm-slider-row', WMSliderRow);