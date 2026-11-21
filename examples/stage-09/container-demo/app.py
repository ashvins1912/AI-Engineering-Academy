












 if not isinstance(weights,list) or not weights or not all(isinstance(x,(int,float)) and not isinstance(x,bool) for x in weights):

 if not isinstance(bias,(int,float)) or isinstance(bias,bool): raise ValueError("model bias must be numeric")

























   payload=json.loads(self.rfile.read(length))
   if not isinstance(payload,dict): return self.send_json(400,{"error":"invalid_request","detail":"JSON body must be an object"})









 def stop(*_):
  global READY







