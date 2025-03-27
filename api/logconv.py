from http.server import BaseHTTPRequestHandler
import datetime
import json
import logging
from api.convutil import (
    sendSOTA_A,
    sendSOTA_C,
    sendADIF,
    sendAirHamLog,
    decodeHamlog,
    writeZIP,
)
from api.fleonline import do_command, compileFLE
from api.wspr import WSPRspots
import cgi
import io

logger = logging.getLogger("Hamlogconv")
logging.basicConfig(level=logging.ERROR)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # パスで処理を分岐
            if self.path.startswith('/api/logconv/hamlog'):
                self.handle_hamlog()
            elif self.path.startswith('/api/logconv/fleonline'):
                self.handle_fleonline()
            elif self.path.startswith('/api/logconv/wspr'):
                self.handle_wspr()
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            logger.error("stack trace:", exc_info=True)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def handle_hamlog(self):
        # content-typeからマルチパートかどうか判断
        content_type = self.headers.get('Content-Type', '')
        
        # フォームデータの解析
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={'REQUEST_METHOD': 'POST'}
        )
        
        # フォームデータの取得
        activation_call = form.getvalue("activation_call")
        chaser_call = form.getvalue("chaser_call")
        pota_activation_call = form.getvalue("pota_activation_call")
        gpx_trk_interval = form.getvalue("gpx_trk_interval")
        command = form.getvalue("command")

        options = {
            "Portable": form.getvalue("portable", ""),
            "QTH": form.getvalue("QTH", ""),
            "hisQTH": form.getvalue("hisQTH", ""),
            "hisQTHopt": form.getvalue("hisQTHopt", ""),
            "myQTH": form.getvalue("myQTH", ""),
            "Note": form.getvalue("Note", ""),
            "Summit": form.getvalue("summit", ""),
            "Location": form.getvalue("location", ""),
            "WWFFOperator": form.getvalue("wwffoperator", ""),
            "WWFFActivator": form.getvalue("wwffact_call", ""),
            "WWFFRef": form.getvalue("wwffref", ""),
            "SOTAActivator": activation_call,
            "POTAActivator": pota_activation_call,
            "POTAOperator": form.getvalue("pota_operator"),
            "Park": form.getvalue("park", ""),
        }

        # ファイルの取得
        if "filename" not in form:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Please input HAMLOG csv file."}).encode('utf-8'))
            return
            
        fileitem = form["filename"]
        # ファイルデータをStreamに変換
        if fileitem.file:
            fp = fileitem.file
        else:
            fp = io.BytesIO(fileitem.value)

        # ファイル名の生成
        now = datetime.datetime.now()
        fname = now.strftime("%Y-%m-%d-%H-%M")

        inchar = "cp932"
        outchar = "utf-8"

        try:
            if activation_call:
                callsign = activation_call
                fname = f"sota-{fname}.zip"
                files = sendSOTA_A(fp, decodeHamlog, callsign, options, inchar, outchar)
                zip_data = writeZIP(files)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', f"attachment; filename={fname}")
                self.end_headers()
                self.wfile.write(zip_data)
                self.wfile.flush()  # flushする！
           
            elif chaser_call:
                callsign = chaser_call
                fname = f"sota-{fname}.zip"
                files = sendSOTA_C(fp, decodeHamlog, callsign, options, inchar, outchar)
                zip_data = writeZIP(files)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', f"attachment; filename={fname}")
                self.end_headers()
                self.wfile.write(zip_data)
                self.wfile.flush()  # flushする！
            
            elif pota_activation_call:
                files, res = sendADIF(fp, options, inchar, outchar)
                if command == "ADIFCSVCheck":
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(res).encode('utf-8'))
                else:
                    fname = f"adif-{fname}.zip"
                    zip_data = writeZIP(files)
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/zip')
                    self.send_header('Content-Disposition', f"attachment; filename={fname}")
                    self.send_header('Content-Length', str(len(zip_data)))  # 長さ指定！
                    self.end_headers()
                    
                    self.wfile.write(zip_data)
                    self.wfile.flush()  # flushする！
            else:
                fname = f"airhamlog-{fname}"
                files = sendAirHamLog(fp, fname+".csv", decodeHamlog, options, inchar, outchar)
                zip_data = writeZIP(files)
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', f"attachment; filename={fname}.zip")
                self.end_headers()
                self.wfile.write(zip_data)
                self.wfile.flush()  # flushする！
                
        except Exception as e:
            logger.error("stack trace:", exc_info=True)
            logger.error(f"options: {options}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def handle_fleonline(self):
        # content-typeからマルチパートかどうか判断
        content_type = self.headers.get('Content-Type', '')
        
        # フォームデータの解析
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={'REQUEST_METHOD': 'POST'}
        )
        
        command = form.getvalue("command", None)
        arg = form.getvalue("arg", json.dumps("None"))
        text = form.getvalue("edittext", None)

        now = datetime.datetime.now()
        fname = "fle-" + now.strftime("%Y-%m-%d-%H-%M") + ".zip"

        try:
            if command:
                if len(arg) < 131072:
                    res = do_command(command, arg)
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(res).encode('utf-8'))
                else:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Line too long"}).encode('utf-8'))
            elif text:
                zip_data = compileFLE(text, True)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', f"attachment; filename={fname}")
                self.send_header('Content-Length', str(len(zip_data)))  # 長さ指定！
      
                self.end_headers()
                self.wfile.write(zip_data)
                self.wfile.flush()  # flushする！
        
        except Exception as e:
            logger.error("stack trace:", exc_info=True)
            logger.error(f"options: {command, arg, text}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def handle_wspr(self):
        # フォームデータの解析
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={'REQUEST_METHOD': 'POST'}
        )
        
        arg = form.getvalue("arg", None)
        svg_buffer = WSPRspots(arg)
        
        self.send_response(200)
        self.send_header('Content-Type', 'image/svg+xml')
        self.end_headers()
        self.wfile.write(svg_buffer.getvalue())
        