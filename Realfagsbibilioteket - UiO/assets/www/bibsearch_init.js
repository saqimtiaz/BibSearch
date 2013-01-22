	//
	//start cursor functions

	//set cursor position
	$.fn.setCursorPosition = function(position){
		if(this.length == 0) return this;
		return $(this).setSelection(position, position);
	};
	 
	//set selection range
	$.fn.setSelection = function(selectionStart, selectionEnd) {
		if(this.length == 0) return this;
		input = this[0];
	 
		if (input.createTextRange) {
			var range = input.createTextRange();
			range.collapse(true);
			range.moveEnd('character', selectionEnd);
			range.moveStart('character', selectionStart);
			range.select();
		} else if (input.setSelectionRange) {
			input.focus();
			input.setSelectionRange(selectionStart, selectionEnd);
		}
	 
		return this;
	};		

	//end cursor functions
	//
	
	//
	//start handlebars custom extensions
	Handlebars.registerHelper('listauthors', function(context, block) {
		return context.map(function(item) {
			return item.presentableName;
		}).join(", ");
	});
	
	Handlebars.registerHelper('listisbn', function(context, block) {
		return context.map(function(item) {
			return item;
		}).join(", ");
	});

	Handlebars.registerHelper('bookformat', function(context, block) {
		return context == "electronic" ? "Electronic" : "Printed";
	});
	
	Handlebars.registerHelper('pluralize', function(number, single, plural) {
		if (number === 1) { 
			return single; 
		}
		else { 
			return plural; 
		}
	});
	
	Handlebars.registerHelper('ifCond', function(v1, v2, options) {
	  if(v1 == v2) {
		return options.fn(this);
	  } else {
		return options.inverse(this);
	  }
	});			

	Handlebars.registerHelper('unlessCond', function(v1, v2, options) {
	  if(v1 != v2) {
		return options.fn(this);
	  } else {
		return options.inverse(this);
	  }
	});
	//end handlebars custom extensions
	//

	//
	// dev hack to allow for jsonp functionality when working with local files	
	if (window.location.href.indexOf("saq") > -1 || window.location.href.indexOf("mohamsi") > -1) {
		window.JSONP = "jsonp=?";
	} else {
		window.JSONP = "";
	}	
	
	//
	//init code for JQM
	
	//global object to hold all custom code.
	window.BookWorms = { searchCache: {}};
	$(document).bind("mobileinit", function(){
	
		//window.share = new Share();
		$.mobile.defaultPageTransition = "none";
		BookWorms.DB =  new Lawnchair(function(){});
		window.BookWorms.FavHistory = [];
		BookWorms.DB.get("favhistory",function(d){
			if (d != null) {
				window.BookWorms.FavHistory = d.history;
			}
		});
		$.each(BookWorms.FavHistory, function (i, el) {
			BookWorms.DB.get(el, function(d){
				//console.log(el,d);
				window.BookWorms.searchCache[el] = d.doc;
				//console.log("cache",window.BookWorms.searchCache);
			});
		});
		
		window.BookWorms.includeEbooks = "on";
		BookWorms.DB.get("includeebooks", function(d) {
			if (d != null) {
				window.BookWorms.includeEbooks = d.status;
			}
		});
		
		$.ajaxSetup({
			timeOut: 10000,
		  
			error: function(jqXHR, textStatus, errorThrown) {
				alert("There was an error connecting to the server, please check your internet connection.");
		  		$.mobile.hidePageLoadingMsg();
				$('#block-ui').hide();
		  	}
		});
	});	
	
	$(document).bind("pageshow", function(e,data) {

		$(this).addClass('ui-page-active');
		$.mobile.hidePageLoadingMsg();
		$('#block-ui').hide();
	});

	// Listen for any attempts to call changePage().
	$(document).bind( "pagebeforechange", function( e, data ) {
		

		// We only want to handle changePage() calls where the caller is
		// asking us to load a page by URL.

		if ( typeof data.toPage === "string" ) {

			//window.BookWorms.nextPage = data.toPage;
			// We are being asked to load a page by URL, but we only
			// want to handle URLs that request the data for a specific
			// category.
			var u = $.mobile.path.parseUrl( data.toPage ),
				re = /^#page_search_results/;

			if ( u.hash.search(re) !== -1 ) {

				// We're being asked to display the items for a specific category.
				// Call our internal method that builds the content for the category
				// on the fly based on our in-memory category data structure.
				$.mobile.showPageLoadingMsg();
				$('#block-ui').show();
				BookWorms.getSearchResults(u, data.options);
				
				// Make sure to tell changePage() we've handled this call so it doesn't
				// have to do anything.
				e.preventDefault();
				return false;
			}
			
			re = /^#page_books/;
			if ( u.hash.search(re) !== -1 ) {

				// We're being asked to display the items for a specific category.
				// Call our internal method that builds the content for the category
				// on the fly based on our in-memory category data structure.
				$.mobile.showPageLoadingMsg();
				$('#block-ui').show();
				BookWorms.getBook(u, data.options);

				// Make sure to tell changePage() we've handled this call so it doesn't
				// have to do anything.
				e.preventDefault();
				return false;
			}
			
			if (u.hash == "#page_favorites") {
				//$.mobile.showPageLoadingMsg();
				//$('#block-ui').show();
				BookWorms.showFavorites(u, data.options);
				return;
			}
			
			re = /^#favorite_delete/;
			
			if (u.hash.search(re) !== -1) {
				//console.log(1);
				BookWorms.updateFavDeleteDialog(u, data.options);
				return;
			}
			
			if (u.hash == "" || u.hash == "#page_home") {
				BookWorms.updateHomeFavorites();
				return;
			}
		/*	
			if (u.hash == "#page_search") {
				$("#no_books").html("");
				$('#searchinput1').val("");
			//	if (window.BookWorms.AutocompleteA)
			//		$(window.BookWorms.AutocompleteA.container).scrollTop(0);
			}
			*/
			if (u.hash == "#page_map" || u.hash == "#page_book_directions") {
				var b = window.BookWorms.currentBook;
				//console.log(b);
				var subject = b.collection;
				if (BookCollections[b.collection] == undefined) {
					alert("This subject has not been mapped for the protoype, try a book in Physics instead");
					e.preventDefault();
					return false;							
				} else {
					var callnr = b.callnumber;
					var emnenr = callnr.split(" ")[0];
					var locnr = callnr.split(" ")[1];
					var emne = BookCollections[b.collection][emnenr];
					//console.log(emne);
					var section;
					var shelf;
					$.each(emne.sectionmap, function(key,value) {
						//console.log(key,value);
						if (value.start <= locnr && value.end >= locnr) {
							//console.log(key);
							section = key;
							return false;
						}
					});
					//console.log(section);
					
					$.each(emne.sectionmap[section].shelves, function(key,value) {
						//console.log(key);
						if (value.start <= locnr && value.end >= locnr) {
							shelf = key;
						}
					});
					
					//console.log(shelf);
					//$("#map_shelf_loc").html("Section: " + section + ", shelf: " + shelf);
					$("#book_map_large").attr("src", "images/vertical/hylle" + section + ".png" );
					
				}
			}
			
		}
	});		
	
	$("#page_home").live('pagebeforecreate',function(event) {
		BookWorms.updateHomeFavorites();
		$("#home_search_box").bind('mouseover', function(){
		   return false;
		});
		
	$('#home_search_button').bind('click', function (e) {
		e.preventDefault();
		var term = $('#searchinput2').val();
		//console.log(term);
		if (term == "")
			return false;
		if (window.BookWorms.AutocompleteB)
			window.BookWorms.AutocompleteB.container.hide();
		
		$.mobile.changePage(BookWorms.getAppSearchUrl(term,0));
		return false;
	});
	
	$("#home_search_form").submit(function(e){
		window.BookWorms.AutocompleteB.container.hide();
		e.preventDefault();
		return false;
	});
	
	
	$('#home_search_form').submit(function() {
		$("#home_search_button").trigger("click");
	});				
		
	});
	
	
	$("#page_home").live('pageshow',function(event) {
		if(!window.BookWorms.autoCompleteInit2) {
			//var options = {'serviceUrl' : "https://ask.bibsys.no/ask2/json/autocompleteProxy.jsp?jsonp=?","index":"title", minChars: 3};
			var options = {'serviceUrl' : "https://ask.bibsys.no/ask2/json/autocompleteProxy.jsp?"+window.JSONP,"index":"title", minChars: 3};
			window.BookWorms.AutocompleteB = $("#searchinput2").autocomplete(options);
			//alert(window.BookWorms.AutocompleteA);
			window.BookWorms.autoCompleteInit2 = true;
		}
		$("#searchinput2").val("");
	});
	
	$("#page_search_results").live('pagebeforeshow', function(event) {
		//console.log(1);
		$('#ebook_toggle').val(window.BookWorms.includeEbooks).slider("refresh");
		
	});
	
	$("#page_search_results").live('pageshow', function(event) {
		//console.log(event);
		$(this).addClass('ui-page-active');
		//console.log(2);
		if(!window.BookWorms.autoCompleteInit) {
			//var options = {'serviceUrl' : "https://ask.bibsys.no/ask2/json/autocompleteProxy.jsp?jsonp=?","index":"title", minChars: 3};
			var options = {'serviceUrl' : "https://ask.bibsys.no/ask2/json/autocompleteProxy.jsp?"+window.JSONP,"index":"title", minChars: 3};
			window.BookWorms.AutocompleteA = $("#searchinput1").autocomplete(options);
			//alert(window.BookWorms.AutocompleteA);
			window.BookWorms.autoCompleteInit = true;
		}
		$(document).scrollTop(0);
	});