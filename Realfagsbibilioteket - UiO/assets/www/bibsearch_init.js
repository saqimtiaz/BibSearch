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
	
	//Truncates string from https://github.com/ziogas/HandlebarsJS-helpers/blob/master/script.js
	Handlebars.registerHelper ( 'truncate', function ( str, len ) {

	    if (str.length > len) {
	        var new_str = str.substr ( 0, len+1 );

	        while ( new_str.length )
	        {
	            var ch = new_str.substr ( -1 );
	            new_str = new_str.substr ( 0, -1 );

	            if ( ch == ' ' )
	            {
	                break;
	            }
	        }

	        if ( new_str == '' )
	        {
	            new_str = str.substr ( 0, len );
	        }

	        return new Handlebars.SafeString ( new_str +'...' ); 
	    }
	    return str;
	} );	
	
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
	window.BookWorms = {
			platform : null,
			searchCache: {}
	};
	
	// hook in before JQM initializes and setup defaults and initialize lawnchair
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
				window.BookWorms.searchCache[el] = d.doc;
			});
		});
		
		//set default state of ebooks toggle switch
		window.BookWorms.includeEbooks = "on";
		BookWorms.DB.get("includeebooks", function(d) {
			if (d != null) {
				window.BookWorms.includeEbooks = d.status;
			}
		});
		
		//defaults for ajax requests, we want to show a message when requests timeout and hide the ui blocking div
		$.ajaxSetup({
			timeOut: 10000,
		  
			error: function(jqXHR, textStatus, errorThrown) {
				//console.log(jqXHR,textStatus,errorThrown);
				alert("There was an error connecting to the server, please check your internet connection.");
		  		$.mobile.hidePageLoadingMsg();
				$('#block-ui').hide();
		  	}
		});
	});	

	
	document.addEventListener("deviceready", function(){
		
		if (device && device.platform) {
			BookWorms.platform = device.platform.replace(/\s+Simulator$/, "");
		}
		//alert("ready");
	/*	
		if(BookWorms.platform == "Android") {
			$(".logo_home_button").click(function(e){
				history.back();
			});
		}
		*/
	});
	
	
	//always make sure that a pageshow results in the loading message being hidden and the UI blocking disabled.
	// we need this since we manually show a message and block the UI to prevent multiple actions when network connectivity is slow
	$(document).bind("pageshow", function(e,data) {
		$(this).addClass('ui-page-active');
		$.mobile.hidePageLoadingMsg();
		$('#block-ui').hide();
		
		//alert(BookWorms.platform);
		if (BookWorms.platform== "Android") {
			
			$(".logo_home_button").unbind("click").click(function(e){
				//console.log("2");
				//console.log(this);
				//history.back();
				$.mobile.changePage("index.html");
				return false;
			});		
		} else {
			$(".logo_home_button").unbind("click").click(function(e){
				//console.log("2");
				//console.log(this);
				history.back();
				return false;
			});	
			
		}
	});

	
	// Listen for any attempts to call changePage().
	// All pages that need customization depending on the query portion of the hash need a hook in here
	$(document).bind( "pagebeforechange", function( e, data ) {
		
		// We only want to handle changePage() calls where the caller is
		// asking us to load a page by URL.

		if ( typeof data.toPage === "string" ) {

			// We are being asked to load a page by URL, but we only
			// want to handle URLs that match specific patterns
			var u = $.mobile.path.parseUrl( data.toPage ),
				re = /^#page_search_results/;

			if ( u.hash.search(re) !== -1 ) {

				// We're being asked to display the items for a specific search
				// Fetch the search results from the server, the callback will handle the page display
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

				// We're being asked to display information about a specific book.
				// Call our internal method that fetches the book information, the callback will display the page
				$.mobile.showPageLoadingMsg();
				$('#block-ui').show();
				BookWorms.getBook(u, data.options);

				// Make sure to tell changePage() we've handled this call so it doesn't
				// have to do anything.
				e.preventDefault();
				return false;
			}
			
			if (u.hash == "#page_favorites") {
				BookWorms.showFavorites(u, data.options);
				return;
			}
			
			re = /^#favorite_delete/;
			
			if (u.hash.search(re) !== -1) {
				//update the dialog for deleting favorites with the appropriate book title and id
				BookWorms.updateFavDeleteDialog(u, data.options);
				return;
			}
			
			// this is the home page, each time it is going to be shown we want to refresh the list of favorites.
			if (u.hash == "" || u.hash == "#page_home") {
				BookWorms.updateHomeFavorites();
				return;
			}
			
			if (u.hash == "#page_floor_help") {
				$("#floor_help_illustration").attr("src","images/floor" + window.BookWorms.currentBook.floor + ".png");
				return;
			}

			if (u.hash == "#page_map" || u.hash == "#page_book_directions") {
				
				
				var b = window.BookWorms.currentBook;
				
				var url = "http://folk.uio.no/kyrretl/bibl/biblab/bibsearch/imgtest.php?collection=%22" + b.collection + "%22&callnumber=%22" + b.callnumber + "%22";
				var orientation = "&orientation=v";
				$("#book_map_large").attr("src", url + orientation );
				$("#book_map").attr("src", url );
				
				/*
				var subject = b.collection;
				if (BookCollections[b.collection] == undefined) {
					alert("This subject has not been mapped for the prototype, try a book in Physics instead");
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
					$("#book_map_large").attr("src", "http://folk.uio.no/kyrretl/bibl/biblab/bibsearch/imgtest-saq.php?collection=%22Farm.%22&callnumber=%2210.80%22PER%22&orientation=v" );
					
				}
				*/
			}
			
		}
	});		
	
	//hook in before the home page is created
	$("#page_home").live('pagebeforecreate',function(event) {
		//populate the list of favorites
		BookWorms.updateHomeFavorites();
		// remove the default mouseover event from the box surrounding the search box
		$("#home_search_box").bind('mouseover', function(){
		   return false;
		});
	
	// add behaviour to the search button on the home page	
	$('#home_search_button').bind('click', function (e) {
		e.preventDefault();
		var term = $('#searchinput2').val();
		//console.log(term);
		//do nothing if no text is entered
		if (term == "")
			return false;
		// hide autocomplete for this search field
		if (window.BookWorms.AutocompleteB)
			window.BookWorms.AutocompleteB.container.hide();
		//change page to a URL that contains the search term. This will fetch the search results and display them.
		$.mobile.changePage(BookWorms.getAppSearchUrl(term,0));
		return false;
	});
	
	// Hide the autocomplete list when the search form is submitted so that we don't have a hanging orphan list of suggestions.
	$("#home_search_form").submit(function(e){
		window.BookWorms.AutocompleteB.container.hide();
		e.preventDefault();
		return false;
	});
	
	
	//map the submitting of the search form to a click on the search button.
	$('#home_search_form').submit(function() {
			$("#home_search_button").trigger("click");
		});				
	});
	
	
	$("#page_home").live('pageshow',function(event) {
		//initialize autocomplete on the home page if it isn't already initialized
		if(!window.BookWorms.autoCompleteInit2) {
			var options = {'serviceUrl' : "https://ask.bibsys.no/ask2/json/autocompleteProxy.jsp?"+window.JSONP,"index":"title", minChars: 3};
			window.BookWorms.AutocompleteB = $("#searchinput2").autocomplete(options);
			window.BookWorms.autoCompleteInit2 = true;
		}
		//clear the previous search query from the search input field
		$("#searchinput2").val("");
	});
	
	//refresh the state of the ebook toggle so it matches the user preference.
	$("#page_search_results").live('pagebeforeshow', function(event) {
		$('#ebook_toggle').val(window.BookWorms.includeEbooks).slider("refresh");
		
	});
	
	// when the search results page is shown, ensure that autocomplete has been initalized and scroll to the top as we might be transitioning to the same page.
	$("#page_search_results").live('pageshow', function(event) {
		$(this).addClass('ui-page-active');
		if(!window.BookWorms.autoCompleteInit) {
			var options = {'serviceUrl' : "https://ask.bibsys.no/ask2/json/autocompleteProxy.jsp?"+window.JSONP,"index":"title", minChars: 3};
			window.BookWorms.AutocompleteA = $("#searchinput1").autocomplete(options);
			window.BookWorms.autoCompleteInit = true;
		}
		$(document).scrollTop(0);
	});
	
	/*
	$("#page_map").live('pageshow', function(event){
		//console.log("showing");
		//$(document).scrollTop($(document).height()-$(window).height());
		$('html, body').animate({
		    scrollTop: $(document).height()-$(window).height()},
		    1400, "swing"
		);
	});
	*/