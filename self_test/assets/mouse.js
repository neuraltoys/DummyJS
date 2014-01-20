(function($) {
	$('.mouse_target').on('click mouseenter mouseleave dblclick', function(e) {
		console.log(this.className, ' - ' , e.type);
		$(this).addClass(e.type);
	});


	$(document).on('mousemove', function(e) {
		var $crumb = $('<div class="mouse_trail"/>');
		$crumb.appendTo('body');
		$crumb.css({
			left: e.pageX + 1,
			top: e.pageY + 1
		});
	});

})(jQuery, undefined);
