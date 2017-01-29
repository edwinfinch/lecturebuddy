$(document).ready(function() {
    $('.container').hide();
    
    $('#getstarted').on('click', function(){
        
        $('.container_splash').slideToggle();
        $('.container').show();
        $('.container').addClass('animated bounceInDown');
    });
});
