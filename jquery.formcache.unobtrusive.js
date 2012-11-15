(function ($) {
    $(function () {

        var registerCachedForms = function () {
            $("[data-formcache]").formCache();
        };

        (function () {
            registerCachedForms();
        })();
    });
})(jQuery);