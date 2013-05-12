window.NoBarCodeHelp = false;

$.extend(BookWorms,{
	getBook : function(urlObj, options) {
		var recordId = urlObj.hash.split("?")[1];
		if (window.BookWorms.searchCache[recordId] != undefined) {
			BookWorms.getDetailedBookInfo({result:{documents : [window.BookWorms.searchCache[recordId]]}}, urlObj, recordId,options);
		} else {
			//XXX add timestamp
			//var url = "https://ask.bibsys.no/ask2/json/result.jsp?jsonp=?" + "&cql=bs.objektid%3D%22" + recordId + '%22%20AND%20(bs.avdeling%20=%20"UREAL")';
			var url = "https://ask.bibsys.no/ask2/json/result.jsp?" + window.JSONP + "&cql=bs.objektid%3D%22" + recordId + '%22%20AND%20(bs.avdeling%20=%20"UREAL")';
			$.getJSON(url, function (data) {
				BookWorms.getDetailedBookInfo(data,urlObj,recordId,options);
			})
			.error(function(){
				$.mobile.hidePageLoadingMsg();
				$('#block-ui').hide();
			});
			
		}
	},
	
	getDetailedBookInfo : function(data, urlObj, recordId, options) {
		
		var baseURI = "https://ask.bibsys.no/ask2/json/items.jsp?objectid=";
		//var jsonp = "&jsonp=?";
		//var jsonp = "";

		$.getJSON(baseURI + encodeURIComponent(recordId) + "&" + window.JSONP, function(mydata) {
			var docs = mydata.result.documents;
			var filtered = $.grep(docs, function(n, i) {
				return n.institutionsection == "UREAL" ? true : false;
			});
			//XXX only showing first book

			var book = filtered[0];
			
			data.result.documents[0] = $.extend(data.result.documents[0], book);
			
			BookWorms.getFloorForBook(data, urlObj, recordId, options);

		});				
	},
	
	getFloorForBook : function(data, urlObj, recordId, options) {
		
		var url = "http://app.uio.no/ub/bdi/bibsearch/loc.php?collection=%22" + encodeURIComponent(data.result.documents[0].collection) + "%22&callnumber=%22" + data.result.documents[0].callnumber + "%22" ;
		//console.log(0);
		$.get(url, function(mydata){
			//console.log(mydata);
			var bits = mydata.split("\t");
			//console.log(bits);
			data.result.documents[0].floor = bits[1];
			//XXX needs fixing, basement books show as 2nd floor
			
			if (bits[1] == "1") {
				data.result.documents[0].floortext = "1st mezzanine";
			} else if (bits[1] == "2") {
				data.result.documents[0].floortext = "2nd floor / Hangar"
			} else {
				data.result.documents[0].floortext = "";
			}
			
//			data.result.documents[0].floortext = bits[1] == "1" ? "1st mezzanine" : "2nd floor / Hangar";
			data.result.documents[0].mapposition = bits[0];
			BookWorms.showBook(data, urlObj, recordId, options);
		})
		
	},
	
	getSectionForCurrentBook : function() {
		var b = window.BookWorms.currentBook;
		//console.log(b);
		var subject = b.collection;
		if (BookCollections[b.collection] == undefined) {
			//alert("This subject has not been mapped for the protoype, try a book in Physics instead");
			//e.preventDefault();
			//return false;
			return [];							
		} else {
			var callnr = b.callnumber;
			var emnenr = callnr.split(" ")[0];
			var locnr = callnr.split(" ")[1];
			var emne = BookCollections[b.collection][emnenr];
			//console.log(emne);
			var section;
			var shelf;
			//console.log(locnr,emne);
			$.each(emne.sectionmap, function(key,value) {
				//console.log(key,value);
				if (value.start <= locnr && value.end >= locnr) {
				//	console.log(0,key);
					section = key;
					return false;
				} else {
				//	console.log(key,value.start);
				//	console.log(key,value.end);
				}
			});
			//console.log(section);		
			$.each(emne.sectionmap[section].shelves, function(key,value) {
				//console.log(key);
				if (value.start <= locnr && value.end >= locnr) {
					shelf = key;
				}
			});
					
		return [section,shelf];
							}
	},
	
	showBook : function(data, urlObj,recordId,options) {
		//console.log(data);
		//console.log(recordId);
		window.BookWorms.searchCache[recordId] = data.result.documents[0];
		window.BookWorms.currentBook = data.result.documents[0];
		//console.log(BookWorms.currentBook);
		var $page = $("#page_books");
		var source = $("#book_info_template").html();
		var template = Handlebars.compile(source);
		var html = template(data.result.documents[0]);
		$page.page();
		$("#book_info").html(html);
		
		var fav = false;
		BookWorms.DB.exists(recordId, function(exists) {
			if(exists) {
				fav = true;
				};
			});				
		$("#fav_star_button").attr("src", fav ? "star.png" : "star_empty.png");
		
		$("#fav_star_button_link").attr("href","javascript:(function(){BookWorms.toggleFavorite('" + recordId + "');})()");
		$("#favorite_book_button").attr("href","javascript:(function(){BookWorms.toggleFavorite('" + recordId + "');})()");
		if (data.result.documents[0].lending_status == "UTL") {
			$("#status_indicators").addClass("book_unavailable").removeClass("book_available").removeClass("book_ordered");
			$("#button_where_is_it").addClass("ui-disabled");
		} else if (data.result.documents[0].status == "best" || data.result.documents[0].status == "akset") {
			$("#status_indicators").addClass("book_ordered").removeClass("book_available").removeClass("book_unavailable");
			$("#button_where_is_it").addClass("ui-disabled");
		} else {
			$("#status_indicators").addClass("book_available").removeClass("book_unavailable").removeClass("book_ordered");
			$("#button_where_is_it").removeClass("ui-disabled");
		}
		if (window.BookWorms.currentBook.floortext == "") {
			$("#floor_help_link").hide();
		} else {
			$("#floor_help_link").show();
		}
		
		var missing = false;
		
		if (window.BookWorms.currentBook["material"] == "electronic") {
			$("#button_where_is_it").hide();
			$("#button_how_to_access").show();
		} else {
			
			if(jQuery.inArray(window.BookWorms.currentBook["collection"],BookWorms.collections)!= -1) {
			
				$("#button_where_is_it").show();
				$("#button_how_to_access").hide();
				//console.log(data.result.documents[0]);
			} else {
				$("#button_where_is_it").show();
				$("#button_how_to_access").hide();
				missing = true;
			}
			
			
			
			//map urls set here
			
			//var locinfo = BookWorms.getSectionForCurrentBook();
			//$("#book_map").attr("src", "http://folk.uio.no/kyrretl/bibl/biblab/bibsearch/imgtest-saq.php?collection=%22Farm.%22&callnumber=%2210.80%22PER%22" );
			//$("#book_shelf_map").attr("src", "images/shelf" + locinfo[1] + ".png" );
			var s;
			console.log("missing: " + missing);
			if (!missing) {
				s = $("#directions_bookinfo_template").html();
			} else {
				s = $("#directions_bookinfo_template_missing").html();				
			}
			var t = Handlebars.compile(s);
			//data.result.documents[0]["shelf"] = locinfo[1];
			var h = t(data.result.documents[0]);
			$("#directions_book_info").html(h);		
		}

		var newoptions = {dataUrl : urlObj.href, allowSamePageTransition : true};
		$.extend(options,newoptions);
		// console.log(options);
		// console.log(window.BookWorms.currentBook);
		$.mobile.changePage( $page, options );
	},
	
	toggleFavorite : function(recordId) {
		//console.log(recordId);
		var fav = false;
		BookWorms.DB.exists(recordId, function(exists) {
			//console.log(exists);
			if(exists) {
				this.remove(recordId);
				BookWorms.FavHistory = $.grep(BookWorms.FavHistory, function(val) {
					return val !== recordId;
				});
			} else {
				//console.log(recordId);
				//console.log(window.BookWorms.searchCache[recordId+""]);
				this.save({key:recordId,doc:window.BookWorms.searchCache[recordId+""]});
				BookWorms.FavHistory.unshift(recordId);
				if (BookWorms.FavHistory.length > 15) {
					BookWorms.FavHistory.pop();
				}
				fav = true;
			}
		});

		BookWorms.DB.save({key:"favhistory", history: BookWorms.FavHistory});
		//XXX totally broken
		$("#fav_star_button").attr("src", fav ? "star.png" : "star_empty.png"); 
		$("#favorite_book_button").find(".ui-icon").toggleClass("ui-icon-plus").toggleClass("ui-icon-minus");
	},
	
	getAppSearchUrl : function(term, page) {
		return "#page_search_results?term=" + encodeURIComponent(term) + "&page=" + page;
	},

	//XXX no results needs handling
	//XXX pressing enter should start search
	getSearchResults : function(urlObj, options) {
		if (urlObj.hash.indexOf("?") == -1) {
			showSearchResults(undefined,undefined,undefined,urlObj,options);
			return;
		}
		var query = urlObj.hash.split("?")[1];
		var parameters = query.split("&");
		var term = parameters[0].split("=")[1];
		var page = parameters[1].split("=")[1];
		//XXX add timestamp
		
		var url;
		
		if (window.BookWorms.includeEbooks == "off") {
			//url = "https://ask.bibsys.no/ask2/json/result.jsp?jsonp=?" + "&cql=" + term + '%20AND%20(bs.avdeling%20=%20"UREAL")&page=' + page;
			url = "https://ask.bibsys.no/ask2/json/result.jsp?" + window.JSONP + "&cql=" + term + '%20AND%20(bs.avdeling%20=%20"UREAL")&page=' + page;
		} else {
			//url = "https://ask.bibsys.no/ask2/json/result.jsp?jsonp=?" + "&cql=" + term + '%20AND%20(bs.avdeling%20=%20"UREAL"%20OR(bs.bibkode%20=%20"k"%20AND%20bs.form%20=%20"n"))&page=' + page;
			url = "https://ask.bibsys.no/ask2/json/result.jsp?" + window.JSONP + "&cql=" + term + '%20AND%20(bs.avdeling%20=%20"UREAL"%20OR(bs.bibkode%20=%20"k"%20AND%20bs.form%20=%20"n"))&page=' + page;
		}
		
		$.getJSON(url, function (data) {
			BookWorms.showSearchResults(data,term,page,urlObj,options,decodeURIComponent(term));
		});				
	},

	showSearchResults : function(data,term,pagenr,urlObj,options,query) {
		if (term != undefined) {
			var totalResults = data.result.totalHits;
			//console.log(data);
			/*
			if (totalResults == 0) {
				$("#no_books").html('No search results found for "' + query + '", check your spelling or try a less specific search.');
				return;
			}
			*/
		
			var prev = parseInt(pagenr) > 0 ? true : false;
			var prevUrl = BookWorms.getAppSearchUrl(decodeURIComponent(term), parseInt(pagenr) - 1);
			var next = totalResults - (parseInt(pagenr) + 1) * 10 > 0 ? true : false;
			var nextUrl = BookWorms.getAppSearchUrl(decodeURIComponent(term),parseInt(pagenr) + 1);
		}
		
		var $page = $("#page_search_results");
		
		if(term!=undefined) {
		
			var source = $("#search_result_book_template").html();
			var template = Handlebars.compile(source);

			data.result.query = query;
			var html = template(data.result);
		} else {
			var html = "";
			
		}
		$page.page();
		
		if (term == undefined || totalResults > 0) 
			$("#no_books").hide();
		else
			$("#no_books").show();
		
		$("#search_button").removeClass("ui-btn-active");
		//$(document).scrollTop(0);
		
		if (term != undefined) {
			$("#search_results_nav").show();
			$('#searchinput1').val(decodeURIComponent(term));
			$("#search_results_container").html(html).find( ":jqmData(role=listview)" ).listview();
		
			$("#prev_search_button").css("visibility", prev ? "visible" : "hidden").attr("href",prevUrl).removeClass("ui-btn-active");
			$("#next_search_button").css("visibility", next ? "visible" : "hidden").attr("href",nextUrl).removeClass("ui-btn-active");
			if (totalResults > 0) {
				$("#search_page_nr").show();
			} else {
				$("#search_page_nr").hide();
			}
			$("#search_page_nr").html(parseInt(pagenr) + 1 + " / " + parseInt(Math.ceil(totalResults/10)));
		
			//window.BookWorms.searchCache = {};
			$.each(data.result.documents, function(index,val) {
				window.BookWorms.searchCache[val.recordId] = val;
			});
			$.extend(options, {dataUrl : urlObj.href, allowSamePageTransition : true, transition:"none"});
			//console.log(urlObj.href);
			//if (window.BookWorms.nextPage == urlObj.href)
				$.mobile.changePage( $page, options );	
		} else {
			$("#search_results_container").html(html);
			$('#searchinput1').val("");
			$("#search_results_nav").hide();
			$.extend(options, {dataUrl : urlObj.href, allowSamePageTransition : true, transition:"slide"});
			//console.log(urlObj.href);
			//if (window.BookWorms.nextPage == urlObj.href)
				$.mobile.changePage( $page, options );	
		}			
	},

	updateHomeFavorites : function() {
		//console.log(window.BookWorms.FavHistory);
		var favs = [];
		$.each(window.BookWorms.FavHistory, function (i, el) {
			if (i<3) {
				favs.push(window.BookWorms.searchCache[el]);
			} else {
				return false;
			}
		});
		
		//var $page = $("#page_search_results");
		var source = $("#home_favorites_template").html();
		var template = Handlebars.compile(source);
		var html = template({favorites:favs});
		
		var list = $("#home_favorites").html(html);
		if (list.hasClass('ui-listview')) {
			list.listview('refresh');
		}
	},

	showFavorites : function(urlObj, options) {
		window.favs;
		BookWorms.DB.where('record.doc != undefined').asc('doc.title','window.favs = records');
		//a;
		//console.log(favs);
		function SortByTitle(a, b){
		  var aName = a.doc.title.toLowerCase();
		  var bName = b.doc.title.toLowerCase(); 
		  return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
		}

		favs.sort(SortByTitle);
		//console.log(favs);
		var docs = $.map (favs, function (el,i) {
			return el.doc;
		});
		//console.log(docs);
		var $page = $("#page_favorites");
		var source = $("#favorites_list_template").html();
		var template = Handlebars.compile(source);
		var html = template({documents:docs});
		$page.page();
		$("#favlist_container").html(html).find( ":jqmData(role=listview)" ).listview();				
	},

	updateFavDeleteDialog : function(urlObj, options) {
		
		//console.log(1);
		var favid = urlObj.hash.split("?")[1];
		//console.log(favid);
		BookWorms.DB.get(favid, function(d) {
			//console.log(d);
			//console.log(d.doc.title);
			$("#delete_book_title").html(d.doc.title);	
			
		});
		
		//$("#fav_delete_button").attr("href","javascript:(function(){toggleFavorite('" + favid + "');return false;})()");
		$("#fav_delete_button").unbind("click").click(function(e){
			BookWorms.toggleFavorite(favid);
			//return false;
		});
	},

	scanBarcode : function() {
		if (window.NoBarCodeHelp) {
			BookWorms.scanNow();
		} else {
			$.mobile.changePage("#how_to_scan", {transition: 'none', role: 'dialog'});
		}
	},

	scanNow : function() {
		window.plugins.barcodeScanner.scan(
			function(result) {
		    	//alert("We got a barcode\n" + "Result: " + result.text + "\n" + "Format: " + result.format); 
		    	console.log(0);
				$("#searchinput1").val(result.text);
				$("#search_button").click();
			}, 
			function(error) {
	    		alert("Scanning failed: " + error);
		});
	},		

	shareBook : function() {
		var book = window.BookWorms.currentBook;
		
		var authors = book.creators.map(function(item) {
			return item.presentableName;
		}).join(", ");				
		
		var isbn = book.isbn.map(function(item) {
			return item;
		}).join(", ");
						
		var url = "http://openurl.bibsys.no/bibsysx/openurl?" + book.openurlRepresentation;
         //windows.plugins.social.share(url);
         //console.log(url);
         //console.log(windows.plugins);
         //console.log(windows.plugins.social);
         if (BookWorms.platform=="Android"){
            window.plugins.share.show({
                subject: book.title,
                text: book.title + ' by ' + authors + ".\n\n ISBN:" + isbn + ".\n\n" + url },
                function() {}, // Success function
                function() {alert('Share failed')} // Failure function
            
            );
         } else {
         console.log(99);
 //        window.plugins.social.share("hi","","");
           window.plugins.social.share(book.title + ' by ' + authors + ".\n\n ISBN:" + isbn + ".\n\n" + url,url,"");
         }
	}
	
});


$('#search_button').bind('click', function (e) {
	e.preventDefault();
	var term = $('#searchinput1').val();
	//console.log(term);
	if (term == "")
		return false;
	if (window.BookWorms.AutocompleteA)
		window.BookWorms.AutocompleteA.container.hide();
	
	$.mobile.changePage(BookWorms.getAppSearchUrl(term,0));
	return false;
});


$("#scan_ok_button").bind("click", function (e) {
	//console.log(1);
	BookWorms.scanNow();
});


$("#search_page_form").submit(function(e){
	if(window.BookWorms.AutocompleteA)
		window.BookWorms.AutocompleteA.container.hide();
	e.preventDefault();
	return false;
});


$('#search_page_form').submit(function() {
	$("#search_button").trigger("click");
});


$("#ebook_toggle").change(function() {
	window.BookWorms.includeEbooks = $(this).val();
	BookWorms.DB.save({key:"includeebooks", status: $(this).val()});
});


$('#checkbox-scanhelp').change(function() {
	window.NoBarCodeHelp = !window.NoBarCodeHelp;
});
