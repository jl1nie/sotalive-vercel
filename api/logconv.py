from flask import Flask, request, Response
import datetime
import json
import logging
from api.convutil import (
    sendSOTA_A, sendSOTA_C, sendADIF, sendAirHamLog,
    decodeHamlog, writeZIP
)
from api.fleonline import (
    do_command, compileFLE
)

app = Flask(__name__)
logger = logging.getLogger("Hamlogconv")
logging.basicConfig(level=logging.ERROR)

@app.route('/api/logconv/hamlog', methods=['POST'])
def logconv():
    # フォームデータの取得
    activation_call = request.form.get('activation_call')
    chaser_call = request.form.get('chaser_call')
    pota_activation_call = request.form.get('pota_activation_call')
    gpx_trk_interval = request.form.get('gpx_trk_interval')
    command = request.form.get('command')

    options = {
        'Portable': request.form.get('portable', ''),
        'QTH': request.form.get('QTH', ''),
        'hisQTH': request.form.get('hisQTH', ''),
        'hisQTHopt': request.form.get('hisQTHopt', ''),
        'myQTH': request.form.get('myQTH', ''),
        'Note': request.form.get('Note', ''),
        'Summit': request.form.get('summit', ''),
        'Location': request.form.get('location', ''),
        'WWFFOperator': request.form.get('wwffoperator', ''),
        'WWFFActivator': request.form.get('wwffact_call', ''),
        'WWFFRef': request.form.get('wwffref', ''),
        'SOTAActivator': activation_call,
        'POTAActivator': pota_activation_call,
        'POTAOperator': request.form.get('pota_operator'),
        'Park': request.form.get('park', '')
    }

    # ファイルの取得
    if 'filename' not in request.files:
        return Response(json.dumps({"error": "Please input HAMLOG csv file."}), 
                        status=400, mimetype='application/json')
    fileitem = request.files['filename']
    fp = fileitem.stream

    # ファイル名の生成
    now = datetime.datetime.now()
    fname = now.strftime("%Y-%m-%d-%H-%M")

    inchar = 'cp932'
    outchar = 'utf-8'

    try:
        if activation_call:
            callsign = activation_call
            fname = f"sota-{fname}.zip"
            files = sendSOTA_A(fp, decodeHamlog, callsign, options, inchar, outchar)
            zip_data = writeZIP(files)
            return Response(zip_data, mimetype='application/zip', 
                           headers={'Content-Disposition': f'attachment; filename={fname}'})

        elif chaser_call:
            callsign = chaser_call
            fname = f"sota-{fname}.zip"
            files = sendSOTA_C(fp, decodeHamlog, callsign, options, inchar, outchar)
            zip_data = writeZIP(files)
            return Response(zip_data, mimetype='application/zip', 
                           headers={'Content-Disposition': f'attachment; filename={fname}'})

        elif pota_activation_call:
            files, res = sendADIF(fp, options, inchar, outchar)
            if command == "ADIFCSVCheck":
                return Response(json.dumps(res), mimetype='application/json')
            else:
                fname = f"adif-{fname}.zip"
                zip_data = writeZIP(files)
                return Response(zip_data, mimetype='application/zip', 
                               headers={'Content-Disposition': f'attachment; filename={fname}'})
        else:
            fname = f"airhamlog-{fname}.csv"
            res = sendAirHamLog(fp, fname, decodeHamlog, options, inchar, outchar)
            return Response(res, mimetype='text/csv', 
                           headers={'Content-Disposition': f'attachment; filename={fname}'})

    except Exception as e:
        logger.error("stack trace:", exc_info=True)
        logger.error(f"options: {options}")
        return Response(json.dumps({"error": str(e)}), status=500, mimetype='application/json')
    
    
@app.route('/api/logconv/fleonline', methods=['POST'])
def fleonline():
    command = request.form.get('command',None)
    arg = request.form.get('arg',json.dumps("None"))
    text = request.form.get('edittext',None)
    
    now  = datetime.datetime.now()
    fname = "fle-" + now.strftime("%Y-%m-%d-%H-%M") + ".zip"   
    
    try:
        if command:
            if len(arg) < 131072:
                res = do_command(command,arg)
                return Response(json.dumps(res), mimetype='application/json')
            else:
                return Response(json.dumps({"error":"Line too long"}), status=500, mimetype='application/json')
        elif text:
                zip_data = compileFLE(text, True)
                return Response(zip_data, mimetype='application/zip', 
                               headers={'Content-Disposition': f'attachment; filename={fname}'})
                
            
    except Exception as e:
        logger.error("stack trace:", exc_info=True)
        logger.error(f"options: {command, arg, text}")
        return Response(json.dumps({"error": str(e)}), status=500, mimetype='application/json')
    