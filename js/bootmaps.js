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
      clearance: new google.maps.Size(10, 10),
      offset: new google.maps.Size(0, -10)
    };
    var options = $.extend({}, defaults, opts);

    google.maps.OverlayView.apply(this, arguments);
    this.map_ = options.map;
    this.content_ = options.content;
    this.disableAutoPan_ = options.disableAutoPan;
    this.title_ = options.title;
    this.position_ = options.position;
    this.closeOnMapClick_ = options.closeOnMapClick;
    this.template_ = options.template;
    this.margin_ = options.margin;
    this.offset_ = options.offset;
    this.clearance_ = options.clearance;
    this.opening_ = false;
    this.eventListeners_ = [];
    this.moveListener_ = null;
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
    }
};

bootmaps.InfoWindow.prototype.panBox_ = function() {
  var map;
  var bounds;
  var xOffset = 0, yOffset = 0;

  if (!this.disableAutoPan_) {

    map = this.getMap();

    if (map instanceof google.maps.Map) {
      if (!map.getBounds().contains(this.position_)) {
        map.setCenter(this.position_);
      }

      bounds = map.getBounds();

      var $map = $(map.getDiv());
      var mapWidth = $map.width();
      var mapHeight = $map.height();
      var iwWidth = this.elem_.outerWidth();
      var iwHeight = this.elem_.outerHeight();

      var padX = this.clearance_.width;
      var padY = this.clearance_.height;

      var pixPosition = this.getProjection().fromLatLngToContainerPixel(this.position_);

      var halfWidth = (iwWidth + padX) / 2;
      var height = (iwHeight + padY) - this.offset_.height;

      var left = pixPosition.x - halfWidth;
      var right = pixPosition.x + halfWidth;
      var top = pixPosition.y - height;
      var bottom = pixPosition.y + padY;

      if (left <= 0) {
        xOffset = left;
      } else if (right >= mapWidth) {
        xOffset = right - mapWidth;
      }

      if (top <= 0) {
        yOffset = top - padY;
      } else if (bottom >= mapHeight) {
        yOffset = bottom - mapHeight;
      }



      if (!(xOffset === 0 && yOffset === 0)) {
        map.panBy(xOffset, yOffset);
      }
    }
  }
};

bootmaps.InfoWindow.prototype.onAdd = function() {
    this.elem_ = $(this.template_);
    this.elem_.hide();
    this.div_ = this.elem_[0];

    this.updateContent_();
    this.updateTitle_();

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