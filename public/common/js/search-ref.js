/* Callsign Entry Pad for Amateur radio station in JA. 
   Author: JL1NIE
   Based on the following keypad-plugin  
   Author:Vijay krish
   URL:"https://github.com/VijayKrish93/Keypad-plugin"
   Type:Jquery plugin
   Description:Compact keypad plugin which supports text and Numeric
*/

(function ($) {
	$.fn.searchinput = function (options) {
		var options = $.extend({ width: 100, height: 20, candidates: 300, done: null }, options);
		var ele = this;
		var query = ''
		var num_param = ''
		var list_param = ''
		var data_list = []
		var selected = 0
		var done = null
		var initiated = false
		var target = {
			init: function () {
				query = 'https://sotaapp2.fly.dev/api/v2/search/brief?'
				list_param = 'name='
				done = options['done']
				initiated = false
			},
			markup: function () {
				var input = document.createElement("INPUT");
				input.setAttribute('list', "__reference_list")
				input.setAttribute('oninput', "station_input();")
				input.setAttribute('placeholder', "Search")
				input.style.width = options.width + "px";
				input.style.height = "20px";
				input.style.margin = "0px 0px 0px 5px";
				input.style.padding = "0px";
				input.style.fontSize = "12px";
				ele.append(input);
				var span = document.createElement("SPAN");
				span.style.width = 20 + "px";
				span.style.height = "10px";
				span.style.margin = "0px 0px 5px 0px";
				span.style.padding = "0px";
				span.style.fontSize = "10px";
				ele.append(span);
				var datalist = document.createElement("DATALIST")
				datalist.id = "__reference_list";
				datalist.style = "max-height:300px !important; overflow-y: auto !important;";
				ele.append(datalist);
			}
		};
		target.init();
		target.markup();
		window.station_input = function station_input() {
			text = $('input').val()
			station_query(text)
		}

		function station_query(text) {
			$(ele).find("span").each(function (index, s) { s.innerHTML = ''; });
			if (text.length > 0) {
				if (text.length > 14) {
					latlng = text.replace(' ', '').split(',');
					if (latlng[0].match(/\d+\.\d+/) != null &&
						latlng[1].match(/\d+\.\d+/) != null) {
						if (done) {
							$('input').val('')
							$('datalist').empty()
							done({
								'code': 'Unknown',
								'coord': [latlng[0], latlng[1]],
								'name': 'Unknown',
								'data': undefined
							})
						}
					}
				}
				str = text.split(' ')
				for (var s of data_list) {
					if (str[0] != undefined) {
						smt = str[0].toUpperCase()
						if (s['code'] == smt)
							if (done) {
								$('input').val('')
								$('datalist').empty()
								done(s)
							}
					}
				}
				if (options.candidates > 0) {
					dl = $('datalist')
					dl.empty()
					data_list = []
					$.getJSON(query, list_param + text, function (res) {
						number = res['count']
						//$(ele).find("span").each(function(index, s) { s.innerHTML = '&nbsp'+number+'refs&nbsp';});
						if (number < options.candidates && !initiated) {
							initiated = true;
							refs = res['candidates']
							if (refs) {
								for (var s of refs) {
									code = s['code']
									lat = s['lat']
									lng = s['lon']
									name = s['nameJ']
									data = s
									var opt = document.createElement("OPTION")
									if (text.indexOf('"') != -1)
										sname = '"' + name + '"'
									else
										sname = name
									opt.value = code + ' ' + sname
									dl.append(opt)
									data_list.push({
										'code': code,
										'coord': [lat, lng],
										'name': name,
										'data': data
									})
								}
							}
							initiated = false;
						}
					})
				}
			}
		}
	};
}(jQuery));
