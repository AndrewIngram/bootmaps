var bootmaps = bootmaps || {};

bootmaps.InfoWindow = function(opts) {
    var defaults = {
      map: "",
      content: "",
      disableAutoPan: false,
      title: "",
      position: new google.maps.LatLng(0, 0),
      closeOnMapClick: true,
      template: '<div class="popover top map-popover"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"></div></div></div>',
      offset: new google.maps.Size(0, -10),
      showDebugOverlays: false,
      maxHeight: 250
    };
    var options = $.extend({}, defaults, opts);

    google.maps.OverlayView.apply(this, arguments);

    this.options = options;

    this.map_ = options.map;
    this.content_ = options.content;
    this.disableAutoPan_ = options.disableAutoPan;
    this.title_ = options.title;
    this.position_ = options.position;
    this.closeOnMapClick_ = options.closeOnMapClick;
    this.template_ = options.template;
    this.margin_ = options.margin;
    this.offset_ = options.offset;
    this.opening_ = false;
    this.eventListeners_ = [];
    this.moveListener_ = null;
    this.maxHeight_ = options.maxHeight;

    if (options.showDebugOverlays) {
      this.rectangle = new google.maps.Rectangle();
    }
};

bootmaps.InfoWindow.prototype = new google.maps.OverlayView();

bootmaps.InfoWindow.prototype.updateTitle_ = function() {
    if (this.elem_) {
      if (this.title_) {
        this.elem_.find('.popover-title').text(this.title_).show();
      } else {
        this.elem_.find('.popover-title').hide();
      }
    }

};

bootmaps.InfoWindow.prototype.updateContent_ = function() {
    if (this.elem_) {
      this.elem_.find('.popover-content').html(this.content_);
      this.elem_.find('.popover-content').css('overflow', 'auto');
      this.elem_.find('.popover-content').css('maxHeight', this.maxHeight_ + 'px');
    }
};

bootmaps.InfoWindow.prototype.panBox_ = function() {
  if (!this.disableAutoPan_) {

    var map = this.getMap();

    if (map instanceof google.maps.Map) {
      var $map = $(map.getDiv());
      var center = map.getCenter();
      var mapWidth = $map.width();
      var mapHeight = $map.height();
      var iwWidth = this.elem_.outerWidth();
      var iwHeight = this.elem_.outerHeight();

      var pixPosition = this.getProjection().fromLatLngToContainerPixel(this.position_);

      var halfWidth = iwWidth / 2;

      var markerEdges = {
        top: (pixPosition.y - iwHeight) + this.offset_.height,
        left: (pixPosition.x - halfWidth) + this.offset_.width,
        bottom: pixPosition.y,
        right: (pixPosition.x + halfWidth) + this.offset_.width
      };

      var ne = this.getProjection().fromContainerPixelToLatLng(
        new google.maps.Point(markerEdges.left, markerEdges.top), true
      );

      var sw = this.getProjection().fromContainerPixelToLatLng(
        new google.maps.Point(markerEdges.right, markerEdges.bottom), true
      );

      var bounds = new google.maps.LatLngBounds(ne, sw);

      if (this.options.showDebugOverlays) {
        var rectOptions = {
          strokeColor: "#FF0000",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#FF0000",
          fillOpacity: 0.35,
          map: map,
          bounds: bounds
        };
        this.rectangle.setOptions(rectOptions);
      }

      map.panToBounds(bounds);
    }
  }
};

bootmaps.InfoWindow.prototype.onAdd = function() {
    this.elem_ = $(this.template_);
    this.elem_.hide();
    this.div_ = this.elem_[0];

    this.updateTitle_();
    this.updateContent_();

    var cancelHandler = function (e) {
      e.cancelBubble = true;
      if (e.stopPropagation) {
        e.stopPropagation();
      }
    };

    this.elem_.on('mousewheel wheeldown wheel scrollwheel', function(event) {
      event.stopPropagation();
    });

    events = ["mousedown", "scrollwheel", "mouseover", "wheel", "mousewheel", "wheelup", "wheeldown", "mouseout", "mouseup", "click", "dblclick", "touchstart", "touchend", "touchmove"];

    for (var i = 0; i < events.length; i++) {
      this.eventListeners_.push(google.maps.event.addDomListener(this.div_, events[i], cancelHandler));
    }

    this.eventListeners_.push(google.maps.event.addDomListener(this.div_, "mouseover", function (e) {
        this.style.cursor = "default";
    }));

    var panes = this.getPanes();
    panes.floatPane.appendChild(this.div_);
};

bootmaps.InfoWindow.prototype.draw = function() {
    var me = this;

    var pixPosition = this.getProjection().fromLatLngToDivPixel(this.position_);

    var offsetX = (this.elem_.outerWidth() / 2) + this.offset_.width;
    var offsetY = this.elem_.outerHeight() - this.offset_.height;

    this.elem_.css('left', (pixPosition.x - offsetX) + "px");
    this.elem_.css('top', (pixPosition.y - offsetY) + "px");

    if (this.isHidden_) {
        this.elem_.hide();
    } else {
        this.elem_.show();
        if (this.div_ && this.opening_) {
          this.panBox_();
          this.opening_ = false;
        }
    }

};

bootmaps.InfoWindow.prototype.setContent = function(content) {
  this.content_ = content;
  this.updateContent_();
};

bootmaps.InfoWindow.prototype.setTitle = function(title) {
  this.title_ = title;
  this.updateTitle_();
};

bootmaps.InfoWindow.prototype.onRemove = function () {
  if (this.div_) {
    this.elem_.remove();
  }
};

bootmaps.InfoWindow.prototype.setPosition = function (latlng) {
  this.position_ = latlng;

  if (this.div_) {
    this.draw();
  }
  google.maps.event.trigger(this, "position_changed");
};

bootmaps.InfoWindow.prototype.getPosition = function () {
  return this.position_;
};

bootmaps.InfoWindow.prototype.open = function(map, anchor) {
  var me = this;
  this.opening_ = true;

  if (anchor) {
    if (this.getPosition() !== anchor.getPosition()) {
      this.position_ = anchor.getPosition();

      this.moveListener_ = google.maps.event.addListener(anchor, "position_changed", function () {
        me.setPosition(this.getPosition());
      });
    }
  }
  this.setMap(map);

  if (this.closeOnMapClick_) {
    this.eventListeners_.push(google.maps.event.addListener(map, 'click', function(){
      me.close();
    }));
  }
};

bootmaps.InfoWindow.prototype.close = function () {
  if (this.moveListener_) {
    google.maps.event.removeListener(this.moveListener_);
    this.moveListener_ = null;
  }

  if (this.eventListeners_) {
    for (var i = 0; i < this.eventListeners_.length; i++) {
      google.maps.event.removeListener(this.eventListeners_[i]);
    }
    this.eventListeners_ = [];
  }
  this.setMap(null);
};