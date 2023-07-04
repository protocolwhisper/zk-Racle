/**
 * @title Zkracle Contract
 * @author protocolwhisper
 *
 * @notice This contract takes arguments from multiple APIs and uses zk proof to compute the median, standard deviations, and z-score
 *         to determine which API call has the worst result. If the result exceeds three standard deviations of tolerance,
 *         the contract flags that API from accessing further contract functionality.
 */

import {
    SmartContract,
    state,
    State,
    method,
    Permissions,
    Field,
    UInt64,
    UInt32,
    PublicKey,
    Experimental,
    MerkleMapWitness,
    Poseidon,
    SelfProof,
    Struct,
    Circuit, arrayProp, Sign, Signature, PrivateKey, CircuitString
  } from 'snarkyjs';

  
  export class DataRecursiveInput extends Struct({
    oracle_public_key: Field,
    signed_call_results: Signature,
    api_result_onchain: Circuit.array(UInt32 , 4), // Only the numbers of my api_calls
  }) {}
  
  export const ZkZscores = Experimental.ZkProgram({
    publicInput: DataRecursiveInput ,
  
    methods: {
      /**
       * baseCase only verifies witnesses. No transfer of funds should be made in this step.
       */
      baseCase: {
        privateInputs: [],
  
        method(publicInput: DataRecursiveInput ) {
          const api_results_offchain = publicInput.api_result_onchain 
          //Let's breakdown or values 
          let firstcall = new Field(api_results_offchain[0].value)
          let secondcall = new Field(api_results_offchain[1].value)
          let thirdcall = new Field(api_results_offchain[2].value)
          let fourthcall = new Field(api_results_offchain[3].value)
          // Calculate mean (average)
          let mean = (firstcall.add(secondcall).add(thirdcall).add(fourthcall)) 
          mean = mean.div(api_results_offchain.length)

          // Calculate standard deviation
          let stdone = firstcall.sub(mean)
          stdone = stdone.square()
          let stdtwo = firstcall.sub(mean)
          stdtwo = stdtwo.square()
          let stdthree = firstcall.sub(mean)
          stdthree = stdthree.square()
          let stdfour = firstcall.sub(mean)
          stdfour = stdfour.square()

          let std = stdone.add(stdtwo).add(stdthree).add(stdfour)
          std = std.div(api_results_offchain.length - 1)
        // Calculate z-scores
          let zScoresone  = firstcall.sub(mean)
          zScoresone = zScoresone.div(std)
          let zScoretwo  = firstcall.sub(mean)
          zScoretwo = zScoresone.div(std)
          let zScorethree  = firstcall.sub(mean)
          zScorethree = zScoresone.div(std)
          let zScorefour  = firstcall.sub(mean)
          zScorefour = zScoresone.div(std)
          
          // Asserts
          expect(zScoresone).toBeGreaterThanOrEqual(-2);
          expect(zScoresone).toBeLessThanOrEqual(2);
          expect(zScoretwo).toBeGreaterThanOrEqual(-2);
          expect(zScoretwo).toBeLessThanOrEqual(2);
          expect(zScorethree).toBeGreaterThanOrEqual(-2);
          expect(zScorethree).toBeLessThanOrEqual(2);
          expect(zScorefour).toBeGreaterThanOrEqual(-2);
          expect(zScorefour).toBeLessThanOrEqual(2);

         
        },
      },
  
      step: {
        privateInputs: [SelfProof],
  
        /**
         * this method only cares about publicInput.transferFrom1To2
         * notice that transferFrom1To2 can be negative depending on who is transferring to who
         */
        method(publicInput: DataRecursiveInput , earlierProof: SelfProof<DataRecursiveInput >) {
          // verify earlier proof
        earlierProof.verify();
          // assert balances are >= 0 for both parties
          // I can implement here for just obtaining the a random value that it's not the same as de worst z-score
        // So for each roundId I have a value which will make sense tho   
        const api_results_offchain = earlierProof.publicInput.api_result_onchain 
        //Let's breakdown or values 

        //Do a random function 
        let proofcall = new Field(api_results_offchain[0].value)
        let proofcalltwo = new Field(api_results_offchain[1].value)
        let proofcallthree = new Field(api_results_offchain[2].value)
        let proofcallfour = new Field(api_results_offchain[3].value)

        let firstcall = new Field(publicInput.api_result_onchain[0].value)
        let secondcall = new Field(publicInput.api_result_onchain[1].value)
        let thirdcall = new Field(publicInput.api_result_onchain[2].value)
        let fourthcall = new Field(publicInput.api_result_onchain[3].value)
        
        proofcall.assertEquals(firstcall)
        proofcalltwo.assertEquals(firstcall)
        proofcallthree.assertEquals(firstcall)
        proofcallfour.assertEquals(firstcall)
        },
      },
    },
  });
  
  export class RecursiveProof extends Experimental.ZkProgram.Proof(ZkZscores) {}

  //Maybe i need to use the private key 
  const TRUSTED_ORACLE = "B62qibrVhEnDYFnZmPCyuvtxcVRxD62bLBsSTmFS85AP7g7X9fsBepJ"
  export class zkracle extends SmartContract {
    /**
     * We need a hash map that tells us user|token -> the amount of time left until time lock expires.
     * every time sendTokens is called we first check the time lock is not expired
     * 
     */
      // Define contract state
    @state(PublicKey) oraclePublicKey = State<PublicKey>();
    @state(Field) timeLockMerkleMapRoot = State<Field>();
    @state(Field) balanceMerkleMapRoot = State<Field>();
    @state(Field) roundId = State<Field>();
    @state(Field) latestPrice = State<Field>();
    @state(CircuitString) pair =  State<CircuitString>();
    // This doesn't work 

    events = {
      verified: Field,
      proofVerified: Field ,

    };
  
    deploy() {
      super.deploy();
  
      const permissionToEdit = Permissions.proof();
  
      this.account.permissions.set({
        ...Permissions.default(),
        editState: permissionToEdit,
        send: permissionToEdit,
        receive: permissionToEdit,
      });
    }
  
    @method init(zkAppKey: PrivateKey) {
      super.init(zkAppKey);
      this.roundId.set(Field(0));
      this.oraclePublicKey.set(PublicKey.fromBase58(TRUSTED_ORACLE));
      this.requireSignature // Let's ask for the tx to be signed with the pk
    }
    @method initPair(currency: CircuitString) {
       this.pair.set(currency)
    }

    @method getPair(){
      let pair = this.pair.get()
      this.pair.assertEquals(pair)
      return pair 
    }
    /**
     * Verifys is the input Response is from the Oracle
     */
    @method verifySignature(roundIdField: Field, 
      priceField : Field,
      nearbyField1 : Field,
      nearbyField2: Field,
      nearbyField3: Field,signature: Signature){
        // Let's put the roun id
        const oraclePublicKey = this.oraclePublicKey.get()
        this.oraclePublicKey.assertEquals(oraclePublicKey);
        // Evaluate whether the signature is valid for the provided data
        const validSignature = signature.verify(oraclePublicKey, [roundIdField, priceField , nearbyField1 , nearbyField2 , nearbyField3]);
        validSignature.assertTrue();
        // Emit an event containing the verified users id
        this.emitEvent('verified', roundIdField);
      }

    @method postProof(proof: RecursiveProof){
      let{oracle_public_key, signed_call_results, api_result_onchain} = proof.publicInput
      // Verify Signature
      this.verifySignature(this.roundId.get() , api_result_onchain[0].value ,api_result_onchain[1].value,api_result_onchain[2].value,api_result_onchain[3].value , signed_call_results )
      // Verify Proof
      proof.verify() 
      this.emitEvent('proofVerified', signed_call_results)
      //Update rounId 
      this.roundId.set(this.roundId.get().add(1))
      // We get our array 
      let price_feed = proof.publicInput.api_result_onchain
      //SORTED
      let sortedArray = price_feed.sort()
      //Call our state variable
      let latestPrice = this.latestPrice.get()
      this.latestPrice.assertEquals(latestPrice)
      // Update our variable
      this.latestPrice.set(price_feed[1].value)


    }
        
  }
  