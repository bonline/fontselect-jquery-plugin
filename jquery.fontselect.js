/*
 * jQuery.fontselect - A font selector for the Google Web Fonts api
 * Tom Moor, http://tommoor.com
 * Copyright (c) 2011 Tom Moor
 * MIT Licensed
 * @version 0.1
*/
define(['require', 'jquery', 'cookie', 'underscore', 'propertyParser', 'font', 'jquery.isinview', 'fancybox', 'bootstrap-typeahead', 'webfontloader'], function (require, jQuery, Cookies, _) {
(function($){

  $.fn.fontselect = function(options) {  

     var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    var settings = {
      style: 'font-select',
      placeholder: 'Select a font',
      lookahead: 2,
      api: '//fonts.googleapis.com/css?family='
    };
    
    var Fontselect = (function(){
    
      function Fontselect(original, o){
        var self = this;
        this.$original = $(original);
        this.options = o;
        this.active = false;
        window.loaded_fonts = {};
        $.fancybox.showActivity();
        this.fetchFontsList().done(_.bind(function(data){
            // this.$original.hide();
            this.$original.show();
            this.$original.typeahead({ 
                source:data.items,
                displayText: function(item){
                    return item.family;
                },
                fitToElement:true,
                updater: function(item){
                    return item;
                },
                items: "all",
                showHintOnFocus: "all",
                sorter: function(items){
                    self.$results.find("li[data-font-family]").hide();
                    $.each(items, function(index, val) {
                        self.$results.find("li[data-font-family*='"+val.family+"']").show();
                    });
                    self.$results.closest(".popup").trigger("scroll");
                    return [];
                },
                matcher: function(item){
                    return (item.family.toLowerCase().indexOf(this.query.toLowerCase()) !== -1);
                }
            });
            this.setupHtml(data.items);
            this.bindEvents();

            var font = this.$original.val();
            if (font) {
              this.updateSelected();
              this.addFontLink(font);
            }
            
            setTimeout(_.bind(function(){
                this.toggleDrop();
                this.getVisibleFonts();
                $.fancybox.hideActivity();
            },this), 500);
            
        }, this));

      }
      
      Fontselect.prototype.bindEvents = function(){
      
        $('li', this.$results)
        .click(__bind(this.selectFont, this))
        .mouseenter(__bind(this.activateFont, this))
        .mouseleave(__bind(this.deactivateFont, this));
        
        $('span', this.$select).click(__bind(this.toggleDrop, this));
        this.$arrow.click(__bind(this.toggleDrop, this));
      };
      
      Fontselect.prototype.toggleDrop = function(ev){
        
        if(this.active){
          this.$element.removeClass('font-select-active');
          this.$drop.hide();
          $(this.$drop).closest(".popup").off("scroll");
        } else if ($('span', this.$select).is(":visible")) {
          this.$element.addClass('font-select-active');
          this.$drop.show();
          this.moveToSelected();
          $(this.$drop).closest(".popup").scroll(_.debounce(__bind(this.getVisibleFonts, this), 500));
        }
        
        this.active = !this.active;
        return this.$original;
      };
      
      Fontselect.prototype.selectFont = function(){
        var active = $('li.active', this.$results);
        var font = active.data('value');
        this.$original.data("font-weight", active.data("font-weight"));
        this.$original.data("font-style", active.data("font-style"));
        this.$original.data("font-family", active.data("font-family"));
        this.$original.val(font).change();
        this.updateSelected();
        this.toggleDrop();
      };
      
      Fontselect.prototype.moveToSelected = function(){
        
        var $li, font = this.$original.val();
        
        if (font){
          $li = $("li[data-value='"+ font +"']", this.$results);
        } else {
          $li = $("li", this.$results).first();
        }

        this.$results.scrollTop($li.addClass('active').position().top);
      };
      
      Fontselect.prototype.activateFont = function(ev){
        $('li.active', this.$results).removeClass('active');
        $(ev.currentTarget).addClass('active');
      };
      
      Fontselect.prototype.fetchFontsList = function(){
          var cached_gwf_data = $("body").data("gwf-fonts-list")
          if (cached_gwf_data) {
              var deferred = $.Deferred();
              return deferred.resolve(cached_gwf_data);
          }else{
              return $.ajax({
                  type    : "GET",
                  cache   : "true",
                  dataType: "json",
                  url     : $("body").data("gwf-fonts-target") || "/edit/webfonts/", 
                  headers : { "X-CSRFToken" : Cookies.get("csrftoken") },
                  success : function (data) {
                      $("body").data("gwf-fonts-list", data);
                  },
                  error   : function () {
                  
                  }
              });
          }

      };
      
      Fontselect.prototype.deactivateFont = function(ev){
        
        $(ev.currentTarget).removeClass('active');
      };
      
      Fontselect.prototype.updateSelected = function(){
        
        var font = this.$original.val();
      };
      
      Fontselect.prototype.setupHtml = function(fonts){
      
        // this.$original.empty().hide();
        this.$element = $('<div>', {'class': this.options.style});
        this.$arrow = $('<div><b></b></div>');
        this.$select = $('<a><span>'+ this.options.placeholder +'</span></a>');
        this.$drop = $('<div>', {'class': 'fs-drop'});
        this.$results = $('<ul>', {'class': 'fs-results'});
        this.$original.after(this.$element.append(this.$select.append(this.$arrow)).append(this.$drop));
        this.$drop.append(this.$results.append(this.fontsAsHtml(fonts))).hide();
      };
      
      Fontselect.prototype.fontsAsHtml = function(data){
        var self = this;
        var fonts = _.map(data, function(item){
            var variants = _.map(item['variants'], function(variants_item){
                return '<li data-value="'+ ((variants_item === "regular") ? item['family'] : item['family'] + ":" + variants_item) +'" '+
                        'data-font-family="'+item['family'] + ', ' + item['category']+'" '+
                        'data-font-weight="'+(variants_item.replace(/italic/g, '') || 400)+'" '+
                        'data-font-style="'+((variants_item.indexOf("italic") === -1) ? "normal" : "italic")+'" '+
                        'style="font-family: ' + item['family'] + ', ' + item['category'] +
                         '; font-weight: ' + (variants_item.replace(/italic/g, '') || 400) +
                         '; font-style: ' + ((variants_item.indexOf("italic") === -1) ? "normal" : "italic") + ';">' +
                         ((variants_item === "regular") ? item['family'] : item['family'] + ":" + variants_item) +
                        "</li>";
            });
            variants = _.reduce(variants, function(a, b){
                return  a + b;
            });
            return variants;
        });
        fonts = _.reduce(fonts, function(a, b){
            return a + b;
        });
        return fonts;
      };
      
      Fontselect.prototype.getVisibleFonts = function(){
      
        if(this.$results.is(':hidden')) return;
        
        var fs = this;
        var fonts_list = [];
        $('li', this.$results).inViewport()
            .each(function(){
            var font = $(this).data('value');
            if (font && !(font in window.loaded_fonts)) {
                fonts_list.push(font);
                window.loaded_fonts[font] = true;
            }
        });
        fonts_list.length && fs.addFontLink(fonts_list.join(","));
      };
      
      Fontselect.prototype.addFontLink = function(font){
          if (font) {
              require(['font!google,families:['+font+']'], function(Font){
              });
          }
      };
    
      return Fontselect;
    })();

    return this.each(function(options) {        
      // If options exist, lets merge them
      if (options) $.extend( settings, options );
      
      return new Fontselect(this, settings);
    });

  };
})(jQuery);
});